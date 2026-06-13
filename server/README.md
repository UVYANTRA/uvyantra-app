# UVYANTRA CRM — Backend

Express + Prisma + PostgreSQL API для панели мастера и клиентского приложения.

## Локальный запуск

```bash
cd server
npm install
cp .env.example .env   # заполните DATABASE_URL и JWT_SECRET
npx prisma migrate dev --name init
npm run seed            # создаст справочники, сотрудников и демо-клиентов
npm run dev
```

API будет доступен на `http://localhost:3000`.

## Деплой на Railway

1. **Создайте новый проект** на [railway.app](https://railway.app) → "New Project" → "Deploy from GitHub repo"
2. Выберите репозиторий `UVYANTRA/uvyantra-app`
3. В настройках сервиса укажите **Root Directory**: `server`
4. **Добавьте PostgreSQL**: в проекте нажмите "+ New" → "Database" → "PostgreSQL"
   — переменная `DATABASE_URL` подключится автоматически
5. В **Variables** добавьте:
   - `JWT_SECRET` — любая случайная строка (например, сгенерируйте на [randomkeygen.com](https://randomkeygen.com))
   - `NODE_ENV` = `production`
6. Railway автоматически соберёт и задеплоит — миграции применятся при старте (`railway.json`)
7. После первого деплоя выполните сидирование один раз:
   - В Railway откройте сервис → "..." → "Run command" → `npm run seed`

## Тестовые учётные записи (после seed)

| Логин | Пароль | Роль |
|---|---|---|
| `admin` | `uvyantra2024` | Администратор |
| `master` | `1234` | Мастер (Иванов А.П.) |
| `petrov` | `1234` | Мастер (Петров С.В.) |
| `kuzn` | `1234` | Мастер (Кузнецова М.А.) |

⚠️ Смените пароли через панель сотрудников после первого входа.

## API Endpoints

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/auth/login` | Вход, возвращает JWT |
| GET | `/api/auth/me` | Текущий пользователь |
| GET | `/api/clients?search=` | Список / поиск клиентов |
| GET | `/api/clients/by-phone/:phone` | Автозаполнение по телефону |
| POST | `/api/clients` | Создать клиента |
| PATCH | `/api/clients/:id` | Обновить клиента |
| GET | `/api/orders?status=&search=` | Список заказов |
| GET | `/api/orders/next-number` | Следующий номер AUR-ГОД-NNNN |
| POST | `/api/orders` | Создать заказ |
| PATCH | `/api/orders/:id` | Обновить заказ (статус, вес и т.д.) |
| PUT | `/api/orders/:id/lines` | Заменить позиции заказа |
| GET | `/api/catalog` | Справочники (материалы/услуги/изделия) |
| GET | `/api/employees` | Список сотрудников |
| POST | `/api/employees` | Создать сотрудника (admin) |
| PATCH | `/api/employees/:id` | Изменить роль/процент (admin) |
| GET/POST | `/api/warehouse/metal` | Учёт металла |
| GET/POST | `/api/warehouse/stones` | Учёт камней |
| GET/POST | `/api/warehouse/consumables` | Расходники |
| GET/POST | `/api/cash` | Касса (приход/расход) |

Все запросы (кроме `/api/auth/login`) требуют заголовок:
```
Authorization: Bearer <token>
```

## Импорт реальных клиентов из xlsx

Когда будете готовы перенести 2007 клиентов из `Клиенты.xlsx` — напишите, подготовим отдельный скрипт импорта `prisma/import-clients.js`.
