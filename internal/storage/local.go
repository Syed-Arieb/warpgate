package storage

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
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

func (l *LocalAdapter) Upload(path string, r io.Reader) error {
	full := filepath.Join(l.baseDir, path)
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
	full := filepath.Join(l.baseDir, path)
	f, err := os.Open(full)
	if err != nil {
		return nil, fmt.Errorf("open file: %w", err)
	}
	return f, nil
}

func (l *LocalAdapter) Delete(path string) error {
	return os.Remove(filepath.Join(l.baseDir, path))
}

func (l *LocalAdapter) Exists(path string) (bool, error) {
	_, err := os.Stat(filepath.Join(l.baseDir, path))
	if os.IsNotExist(err) {
		return false, nil
	}
	return err == nil, err
}

func (l *LocalAdapter) URL(path string) (string, error) {
	return fmt.Sprintf("%s/%s", l.baseURL, path), nil
}
