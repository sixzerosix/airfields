-- =============================================
-- ПОЛНЫЙ СКРИПТ: Notes с Fractional Indexing
-- =============================================
-- Сносим всё и создаём заново.
-- Position — text, ключи валидные для fractional-indexing.
-- =============================================
-- Удаляем старую таблицу (если есть)
DROP TABLE IF EXISTS notes CASCADE;

-- =============================================
-- ТАБЛИЦА
-- =============================================
CREATE TABLE notes (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid REFERENCES auth.users NOT NULL,
	title text NOT NULL CHECK (char_length(title) >= 1),
	description text,
	status text NOT NULL DEFAULT 'todo',
	position text NOT NULL DEFAULT 'a0',
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- ОГРАНИЧЕНИЯ
-- =============================================
ALTER TABLE
	notes
ADD
	CONSTRAINT notes_status_check CHECK (
		status IN (
			'todo',
			'in_progress',
			'review',
			'done',
			'archived'
		)
	);

-- =============================================
-- ИНДЕКСЫ
-- =============================================
CREATE INDEX idx_notes_user_id ON notes (user_id);

CREATE INDEX idx_notes_user_position ON notes (user_id, position);

CREATE INDEX idx_notes_status ON notes (status);

-- =============================================
-- ТРИГГЕР updated_at
-- =============================================
CREATE
OR REPLACE FUNCTION update_updated_at_column() RETURNS trigger AS $ $ BEGIN NEW.updated_at = now();

RETURN NEW;

END;

$ $ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notes_updated_at BEFORE
UPDATE
	ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RLS
-- =============================================
ALTER TABLE
	notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own notes" ON notes FOR
INSERT
	WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own notes" ON notes FOR
SELECT
	USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" ON notes FOR
UPDATE
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" ON notes FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime
ADD
	TABLE notes;

-- =============================================
-- ДЕМО-ДАННЫЕ (30 заметок)
-- =============================================
-- Position ключи: a0, a1, a2, ..., a9, aA, aB, ..., aT
-- Это валидные ключи для библиотеки fractional-indexing.
-- Строковая сортировка = правильный порядок.
-- =============================================
INSERT INTO
	notes (user_id, title, description, status, position)
VALUES
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Купить продукты',
		'Молоко, хлеб, яйца, сыр и овощи',
		'todo',
		'a0'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Подготовить презентацию',
		'Сделать слайды для встречи в пятницу',
		'in_progress',
		'a1'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Позвонить маме',
		'Поздравить с днём рождения',
		'todo',
		'a2'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Закончить рефакторинг auth',
		'Переписать middleware и добавить rate limiting',
		'review',
		'a3'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Отправить отчёт по проекту',
		'Подготовить PDF и отправить заказчику',
		'done',
		'a4'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Почитать книгу "Чистый код"',
		'Прочитать главу 5–7',
		'in_progress',
		'a5'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Оплатить интернет',
		'До 28 марта',
		'todo',
		'a6'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Разобрать старые заметки',
		NULL,
		'archived',
		'a7'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Придумать идеи для нового приложения',
		'Список из 10 идей',
		'todo',
		'a8'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Сходить в зал',
		'Тренировка ног + пресс',
		'done',
		'a9'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Составить список покупок на неделю',
		'Включить фрукты, овощи, курицу',
		'todo',
		'aA'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Выучить 20 новых слов по английскому',
		'Использовать Anki',
		'in_progress',
		'aB'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Подготовить отчёт для руководителя',
		'Метрики за март',
		'review',
		'aC'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Забронировать билеты в отпуск',
		'Москва — СПб на майские',
		'todo',
		'aD'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Написать статью про Supabase',
		'RLS и политики безопасности',
		'in_progress',
		'aE'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Разобрать почту',
		'Ответить на все старые письма',
		'todo',
		'aF'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Купить подарок Саше',
		'Что-то связанное с программированием',
		'todo',
		'aG'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Пройти курс по Tailwind CSS',
		'Закончить модуль 4',
		'review',
		'aH'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Организовать рабочее место',
		'Купить монитор и кресло',
		'done',
		'aI'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Придумать название для проекта',
		'Современное и запоминающееся',
		'in_progress',
		'aJ'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Сходить на пробежку',
		'5 км в парке',
		'todo',
		'aK'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Обновить резюме',
		'Добавить Supabase и Next.js',
		'todo',
		'aL'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Провести код-ревью PR #142',
		'Проверить безопасность',
		'review',
		'aM'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Записаться к стоматологу',
		'На чистку и осмотр',
		'todo',
		'aN'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Почитать "Atomic Habits"',
		'30+ страниц',
		'in_progress',
		'aO'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Оплатить коммунальные услуги',
		'За февраль и март',
		'done',
		'aP'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Создать дизайн главной страницы',
		'В Figma, светлая и тёмная тема',
		'review',
		'aQ'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Написать план развития на квартал',
		'Цели по навыкам',
		'todo',
		'aR'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Сделать уборку в квартире',
		'Генеральная уборка',
		'done',
		'aS'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Изучить новую фичу PostgreSQL 17',
		'Partitioning и JSON',
		'in_progress',
		'aT'
	);

-- =============================================
-- ПРОВЕРКА
-- =============================================
-- SELECT title, position FROM notes ORDER BY position;
-- Должно быть: a0, a1, a2, ..., a9, aA, aB, ..., aT
-- =============================================
-- ОБНОВИТЬ timestamps чтобы сортировка работала визуально
-- =============================================
-- Проблема: все записи вставлены одномоментно → одинаковый created_at
-- → сортировка asc/desc выглядит одинаково
--
-- Фикс: разносим created_at с интервалом 1 час
-- =============================================
UPDATE
	notes
SET
	created_at = now() - ((sub.rn - 1) * interval '1 hour'),
	updated_at = now() - ((sub.rn - 1) * interval '30 minutes')
FROM
	(
		SELECT
			id,
			ROW_NUMBER() OVER (
				PARTITION BY user_id
				ORDER BY
					position ASC
			) as rn
		FROM
			notes
	) sub
WHERE
	notes.id = sub.id;

-- Проверка:
-- SELECT title, position, created_at FROM notes ORDER BY created_at DESC LIMIT 5;
-- =============================================
-- ТЕГИ И КАТЕГОРИИ — Полиморфная архитектура
-- =============================================
-- tags — глобальный пул тегов пользователя
-- entity_tags — M2M связь тег ↔ любая сущность
-- categories — с вложенностью, скоуп по entity_type
-- =============================================
-- =============================================
-- 1. TAGS (глобальный пул)
-- =============================================
CREATE TABLE tags (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid REFERENCES auth.users NOT NULL,
	name text NOT NULL CHECK (char_length(name) >= 1),
	color text DEFAULT '#6B7280',
	created_at timestamptz NOT NULL DEFAULT now()
);

-- Уникальное имя тега на пользователя
ALTER TABLE
	tags
ADD
	CONSTRAINT tags_user_name_unique UNIQUE (user_id, name);

CREATE INDEX idx_tags_user_id ON tags (user_id);

-- RLS
ALTER TABLE
	tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tags" ON tags FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime
ADD
	TABLE tags;

-- =============================================
-- 2. ENTITY_TAGS (M2M — полиморфная связь)
-- =============================================
-- entity_type = 'notes', 'tasks', etc.
-- entity_id = UUID записи из соответствующей таблицы
-- Нет FK на entity_id — полиморфная связь
-- =============================================
CREATE TABLE entity_tags (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid REFERENCES auth.users NOT NULL,
	tag_id uuid REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
	entity_type text NOT NULL,
	entity_id uuid NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);

-- Один тег на одну сущность — не дублируется
ALTER TABLE
	entity_tags
ADD
	CONSTRAINT entity_tags_unique UNIQUE (tag_id, entity_type, entity_id);

CREATE INDEX idx_entity_tags_entity ON entity_tags (entity_type, entity_id);

CREATE INDEX idx_entity_tags_tag ON entity_tags (tag_id);

CREATE INDEX idx_entity_tags_user ON entity_tags (user_id);

-- RLS
ALTER TABLE
	entity_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own entity_tags" ON entity_tags FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime
ADD
	TABLE entity_tags;

-- =============================================
-- 3. CATEGORIES (с вложенностью)
-- =============================================
-- entity_type = скоуп: категории notes ≠ категории tasks
-- parent_id = вложенность (null = корневая)
-- =============================================
CREATE TABLE categories (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid REFERENCES auth.users NOT NULL,
	entity_type text NOT NULL,
	name text NOT NULL CHECK (char_length(name) >= 1),
	parent_id uuid REFERENCES categories(id) ON DELETE
	SET
		NULL,
		color text DEFAULT '#6B7280',
		position text DEFAULT 'a0',
		created_at timestamptz NOT NULL DEFAULT now(),
		updated_at timestamptz NOT NULL DEFAULT now()
);

-- Уникальное имя категории в скоупе entity_type + parent
ALTER TABLE
	categories
ADD
	CONSTRAINT categories_unique_name UNIQUE (user_id, entity_type, parent_id, name);

CREATE INDEX idx_categories_user_entity ON categories (user_id, entity_type);

CREATE INDEX idx_categories_parent ON categories (parent_id);

-- Триггер updated_at
CREATE TRIGGER trigger_update_categories_updated_at BEFORE
UPDATE
	ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE
	categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own categories" ON categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime
ADD
	TABLE categories;

-- =============================================
-- 4. ДОБАВИТЬ category_id В notes
-- =============================================
ALTER TABLE
	notes
ADD
	COLUMN category_id uuid REFERENCES categories(id) ON DELETE
SET
	NULL;

CREATE INDEX idx_notes_category ON notes (category_id);

-- =============================================
-- 5. ДЕМО-ДАННЫЕ
-- =============================================
-- Теги
INSERT INTO
	tags (user_id, name, color)
VALUES
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Важное',
		'#EF4444'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Личное',
		'#3B82F6'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Работа',
		'#F59E0B'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Учёба',
		'#10B981'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Идеи',
		'#8B5CF6'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Срочно',
		'#DC2626'
	);

-- Категории для notes (с вложенностью)
INSERT INTO
	categories (user_id, entity_type, name, color, position)
VALUES
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'notes',
		'Проекты',
		'#3B82F6',
		'a0'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'notes',
		'Быт',
		'#10B981',
		'a1'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'notes',
		'Саморазвитие',
		'#8B5CF6',
		'a2'
	);

-- Подкатегории (parent_id)
INSERT INTO
	categories (
		user_id,
		entity_type,
		name,
		parent_id,
		color,
		position
	)
SELECT
	'4c1a224d-bc95-4804-870c-7832a73462ad',
	'notes',
	sub.name,
	c.id,
	sub.color,
	sub.pos
FROM
	(
		VALUES
			('Проекты', 'Frontend', '#60A5FA', 'a0'),
			('Проекты', 'Backend', '#34D399', 'a1'),
			('Саморазвитие', 'Книги', '#A78BFA', 'a0'),
			('Саморазвитие', 'Курсы', '#F472B6', 'a1')
	) AS sub(parent_name, name, color, pos)
	JOIN categories c ON c.name = sub.parent_name
	AND c.user_id = '4c1a224d-bc95-4804-870c-7832a73462ad'
	AND c.entity_type = 'notes';

-- Привязать теги к нескольким заметкам
INSERT INTO
	entity_tags (user_id, tag_id, entity_type, entity_id)
SELECT
	'4c1a224d-bc95-4804-870c-7832a73462ad',
	t.id,
	'notes',
	n.id
FROM
	tags t,
	notes n
WHERE
	t.user_id = '4c1a224d-bc95-4804-870c-7832a73462ad'
	AND n.user_id = '4c1a224d-bc95-4804-870c-7832a73462ad'
	AND (
		(
			t.name = 'Важное'
			AND n.title IN (
				'Закончить рефакторинг auth',
				'Отправить отчёт по проекту'
			)
		)
		OR (
			t.name = 'Работа'
			AND n.title IN (
				'Подготовить презентацию',
				'Закончить рефакторинг auth',
				'Написать статью про Supabase'
			)
		)
		OR (
			t.name = 'Личное'
			AND n.title IN (
				'Позвонить маме',
				'Сходить в зал',
				'Записаться к стоматологу'
			)
		)
		OR (
			t.name = 'Учёба'
			AND n.title IN (
				'Почитать книгу "Чистый код"',
				'Выучить 20 новых слов по английскому',
				'Пройти курс по Tailwind CSS'
			)
		)
		OR (
			t.name = 'Срочно'
			AND n.title IN (
				'Оплатить интернет',
				'Отправить отчёт по проекту'
			)
		)
	);

-- =============================================
-- ПРОВЕРКА
-- =============================================
-- SELECT t.name AS tag, n.title AS note
-- FROM entity_tags et
-- JOIN tags t ON t.id = et.tag_id
-- JOIN notes n ON n.id = et.entity_id
-- WHERE et.entity_type = 'notes'
-- ORDER BY t.name, n.title;
--
-- SELECT c.name, c.parent_id, p.name AS parent_name
-- FROM categories c
-- LEFT JOIN categories p ON p.id = c.parent_id
-- WHERE c.entity_type = 'notes'
-- ORDER BY c.parent_id NULLS FIRST, c.position;
-- =============================================
-- FIX: Добавить DEFAULT auth.uid() для user_id
-- =============================================
-- Теперь клиент НЕ обязан передавать user_id при INSERT.
-- Supabase подставит auth.uid() автоматически.
-- RLS WITH CHECK (auth.uid() = user_id) пройдёт.
-- =============================================
ALTER TABLE
	tags
ALTER COLUMN
	user_id
SET
	DEFAULT auth.uid();

ALTER TABLE
	entity_tags
ALTER COLUMN
	user_id
SET
	DEFAULT auth.uid();

ALTER TABLE
	categories
ALTER COLUMN
	user_id
SET
	DEFAULT auth.uid();

-- Проверка (опционально):
-- INSERT INTO tags (name, color) VALUES ('test-tag', '#FF0000');
-- SELECT * FROM tags WHERE name = 'test-tag';
-- → user_id должен быть заполнен автоматически
-- Добавляем скоуп
ALTER TABLE
	tags
ADD
	COLUMN entity_type text;

-- Заполняем существующие теги (они были для notes)
UPDATE
	tags
SET
	entity_type = 'notes'
WHERE
	entity_type IS NULL;

-- Делаем обязательным
ALTER TABLE
	tags
ALTER COLUMN
	entity_type
SET
	NOT NULL;

-- Обновляем unique constraint (имя уникально В РАМКАХ entity_type)
ALTER TABLE
	tags DROP CONSTRAINT tags_user_name_unique;

ALTER TABLE
	tags
ADD
	CONSTRAINT tags_user_entity_name_unique UNIQUE (user_id, entity_type, name);