# Atlas Configuration for Wathīqah

data "external_schema" "prisma" {
    program = [
      "npx",
      "prisma",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema",
      "prisma/schema.prisma",
      "--script"
    ]
}

env "local" {
  url = "postgresql://fawazabdganiyu@localhost:5432/wathiqah-db?sslmode=disable"
  dev = "postgresql://fawazabdganiyu@localhost:5432/wathiqah-dev?sslmode=disable"
  schema {
    src = data.external_schema.prisma.url
  }
  migration {
    dir = "file://atlas/migrations"
    baseline = "20260224181022"
    exclude = ["_prisma_migrations"]
  }
}

env "prod" {
  url = getenv("DB_URL")
  schema {
    src = data.external_schema.prisma.url
  }
  migration {
    dir = "file://atlas/migrations"
    exclude = ["_prisma_migrations"]
  }
}
