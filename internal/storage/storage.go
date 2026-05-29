package storage

import "io"

type Adapter interface {
	Upload(path string, r io.Reader) error
	Download(path string) (io.ReadCloser, error)
	Delete(path string) error
	Exists(path string) (bool, error)
	URL(path string) (string, error)
}

type NoopAdapter struct{}

func NewNoopAdapter() *NoopAdapter {
	return &NoopAdapter{}
}

func (n *NoopAdapter) Upload(path string, r io.Reader) error {
	return nil
}

func (n *NoopAdapter) Download(path string) (io.ReadCloser, error) {
	return nil, nil
}

func (n *NoopAdapter) Delete(path string) error {
	return nil
}

func (n *NoopAdapter) Exists(path string) (bool, error) {
	return false, nil
}

func (n *NoopAdapter) URL(path string) (string, error) {
	return "", nil
}
