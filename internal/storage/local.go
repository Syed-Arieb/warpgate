package storage

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

type LocalAdapter struct {
	baseDir string
	baseURL string
}

func NewLocalAdapter(baseDir, baseURL string) (*LocalAdapter, error) {
	abs, err := filepath.Abs(baseDir)
	if err != nil {
		return nil, fmt.Errorf("resolve base dir: %w", err)
	}
	if err := os.MkdirAll(abs, 0755); err != nil {
		return nil, fmt.Errorf("create base dir: %w", err)
	}
	return &LocalAdapter{baseDir: abs, baseURL: baseURL}, nil
}

func (l *LocalAdapter) safePath(path string) (string, error) {
	clean := filepath.Clean(path)
	if clean != path {
		clean = filepath.Clean(path)
	}
	full := filepath.Join(l.baseDir, clean)
	if !strings.HasPrefix(full, filepath.Clean(l.baseDir)+string(os.PathSeparator)) && full != filepath.Clean(l.baseDir) {
		return "", fmt.Errorf("path traversal detected: %s", path)
	}
	return full, nil
}

func (l *LocalAdapter) Upload(path string, r io.Reader) error {
	full, err := l.safePath(path)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(full), 0755); err != nil {
		return fmt.Errorf("create dir: %w", err)
	}
	f, err := os.Create(full)
	if err != nil {
		return fmt.Errorf("create file: %w", err)
	}
	defer f.Close()
	if _, err := io.Copy(f, r); err != nil {
		return fmt.Errorf("write file: %w", err)
	}
	return nil
}

func (l *LocalAdapter) Download(path string) (io.ReadCloser, error) {
	full, err := l.safePath(path)
	if err != nil {
		return nil, err
	}
	f, err := os.Open(full)
	if err != nil {
		return nil, fmt.Errorf("open file: %w", err)
	}
	return f, nil
}

func (l *LocalAdapter) Delete(path string) error {
	full, err := l.safePath(path)
	if err != nil {
		return err
	}
	return os.Remove(full)
}

func (l *LocalAdapter) Exists(path string) (bool, error) {
	full, err := l.safePath(path)
	if err != nil {
		return false, err
	}
	_, err = os.Stat(full)
	if os.IsNotExist(err) {
		return false, nil
	}
	return err == nil, err
}

func (l *LocalAdapter) URL(path string) (string, error) {
	return fmt.Sprintf("%s/%s", l.baseURL, path), nil
}
