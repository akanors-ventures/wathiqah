# Atlas Configuration for Wathīqah

# The "env" block defines environments.
# By default, Atlas uses the "local" environment.
env "local" {
  # Declare where the schema definition resides.
  # Also supported: ["file://schema.sql"].
  src = "file://prisma/schema.prisma"

  # Define the URL of the dev database for this environment
  # See: https://atlasgo.io/concepts/dev-database
  dev = "docker://postgres/16/dev"

  # Run migration linting on the "prisma/migrations" directory
  migration {
    dir = "file://prisma/migrations"
    format = atlas
    exclude = ["_prisma_migrations"]
  }
}
