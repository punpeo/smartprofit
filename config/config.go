package config

import (
	"os"
)

// Config 应用配置
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
}

// ServerConfig HTTP 服务配置
type ServerConfig struct {
	Port      string
	StaticDir string
}

// DatabaseConfig SQLite 配置
type DatabaseConfig struct {
	Path string // SQLite 数据库文件路径
}

// Load 加载配置（环境变量 + 默认值）
func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port:      env("SERVER_PORT", ":8080"),
			StaticDir: env("STATIC_DIR", "static"),
		},
		Database: DatabaseConfig{
			Path: env("DB_PATH", "smartprofit.db"),
		},
	}
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
