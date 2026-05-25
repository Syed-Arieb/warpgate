package storage

import "io"

type Adapter interface {
	Upload(path string, r io.Reader) error
	Download(path string) (io.ReadCloser, error)
	Delete(path string) error
	Exists(path string) (bool, error)
	URL(path string) (string, error)
}
