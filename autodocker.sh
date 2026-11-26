# Construir as imagens e iniciar os containers
docker compose up --build -d

# Verificar os containers
docker compose ps

# Visualizar os logs
docker compose logs -f

# Encerrar a aplicação
docker compose down