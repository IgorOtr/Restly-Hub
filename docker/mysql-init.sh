#!/bin/sh
set -e
# Permite ao usuário da aplicação criar o shadow database do Prisma Migrate.
mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" -e "GRANT ALL PRIVILEGES ON *.* TO '${MYSQL_USER}'@'%'; FLUSH PRIVILEGES;"
