package services

import (
	"context"
	"fmt"

	"github.com/arieb/warpgate/internal/engine"
	"github.com/arieb/warpgate/internal/models"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/types"
	"gorm.io/gorm"
)

type GroupService struct {
	db      *gorm.DB
	manager *engine.Manager
}

func NewGroupService(db *gorm.DB, manager *engine.Manager) *GroupService {
	return &GroupService{db: db, manager: manager}
}

type CreateGroupInput struct {
	Name         string   `json:"name"`
	Participants []string `json:"participants"`
}

type GroupDetail struct {
	models.Group
	Participants []types.GroupParticipant `json:"participants"`
}

func (s *GroupService) List(ctx context.Context, userID, sessionID uint) ([]models.Group, error) {
	var session models.Session
	if err := s.db.Where("id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		return nil, fmt.Errorf("session not found")
	}

	cl := s.manager.GetClient(sessionID)
	if cl == nil {
		return nil, fmt.Errorf("session not connected")
	}

	groups, err := cl.GetJoinedGroups(ctx)
	if err != nil {
		return nil, fmt.Errorf("get groups: %w", err)
	}

	var result []models.Group
	for _, g := range groups {
		groupJID := g.JID.String()
		group := models.Group{
			SessionID:   sessionID,
			UserID:      userID,
			GroupJID:    groupJID,
			Name:        g.GroupName.Name,
			MemberCount: len(g.Participants),
		}
		s.db.Where("session_id = ? AND group_jid = ?", sessionID, groupJID).
			Assign(group).
			FirstOrCreate(&group)
		result = append(result, group)
	}

	if result == nil {
		result = []models.Group{}
	}
	return result, nil
}

func (s *GroupService) Get(ctx context.Context, userID, sessionID uint, groupID string) (*GroupDetail, error) {
	var session models.Session
	if err := s.db.Where("id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		return nil, fmt.Errorf("session not found")
	}

	cl := s.manager.GetClient(sessionID)
	if cl == nil {
		return nil, fmt.Errorf("session not connected")
	}

	jid, err := types.ParseJID(groupID)
	if err != nil {
		return nil, fmt.Errorf("invalid group jid: %w", err)
	}

	groupInfo, err := cl.GetGroupInfo(ctx, jid)
	if err != nil {
		return nil, fmt.Errorf("get group info: %w", err)
	}

	group := models.Group{
		SessionID:   sessionID,
		UserID:      userID,
		GroupJID:    groupInfo.JID.String(),
		Name:        groupInfo.GroupName.Name,
		MemberCount: len(groupInfo.Participants),
	}
	s.db.Where("session_id = ? AND group_jid = ?", sessionID, groupInfo.JID.String()).
		Assign(group).
		FirstOrCreate(&group)

	return &GroupDetail{
		Group:        group,
		Participants: groupInfo.Participants,
	}, nil
}

func (s *GroupService) Create(ctx context.Context, userID, sessionID uint, input CreateGroupInput) (*models.Group, error) {
	var session models.Session
	if err := s.db.Where("id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		return nil, fmt.Errorf("session not found")
	}

	cl := s.manager.GetClient(sessionID)
	if cl == nil {
		return nil, fmt.Errorf("session not connected")
	}

	var participants []types.JID
	for _, p := range input.Participants {
		jid, err := types.ParseJID(p)
		if err != nil {
			return nil, fmt.Errorf("invalid participant jid %s: %w", p, err)
		}
		participants = append(participants, jid)
	}

	groupInfo, err := cl.CreateGroup(ctx, whatsmeow.ReqCreateGroup{
		Name:         input.Name,
		Participants: participants,
	})
	if err != nil {
		return nil, fmt.Errorf("create group: %w", err)
	}

	group := models.Group{
		SessionID:   sessionID,
		UserID:      userID,
		GroupJID:    groupInfo.JID.String(),
		Name:        input.Name,
		MemberCount: len(participants),
	}
	if err := s.db.Create(&group).Error; err != nil {
		return nil, fmt.Errorf("store group: %w", err)
	}

	return &group, nil
}

func (s *GroupService) Delete(ctx context.Context, userID, sessionID uint, groupID string) error {
	var session models.Session
	if err := s.db.Where("id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		return fmt.Errorf("session not found")
	}

	cl := s.manager.GetClient(sessionID)
	if cl == nil {
		return fmt.Errorf("session not connected")
	}

	jid, err := types.ParseJID(groupID)
	if err != nil {
		return fmt.Errorf("invalid group jid: %w", err)
	}

	if err := cl.LeaveGroup(ctx, jid); err != nil {
		return fmt.Errorf("leave group: %w", err)
	}

	s.db.Where("session_id = ? AND group_jid = ?", sessionID, jid.String()).Delete(&models.Group{})
	return nil
}
