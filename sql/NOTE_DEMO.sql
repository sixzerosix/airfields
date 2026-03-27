-- =============================================
-- ПОЛНЫЙ СКРИПТ: Всё с нуля
-- =============================================
-- Notes + Tags + Categories + Entity_Tags
-- Fractional indexing, RLS, Realtime, defaults
-- =============================================
-- Удаляем всё (порядок важен из-за FK)
DROP TABLE IF EXISTS entity_tags CASCADE;

DROP TABLE IF EXISTS tags CASCADE;

DROP TABLE IF EXISTS notes CASCADE;

DROP TABLE IF EXISTS categories CASCADE;

-- =============================================
-- ТРИГГЕР updated_at (общий)
-- =============================================
CREATE
OR REPLACE FUNCTION update_updated_at_column() RETURNS trigger AS $ $ BEGIN NEW.updated_at = now();

RETURN NEW;

END;

$ $ LANGUAGE plpgsql;

-- =============================================
-- CATEGORIES
-- =============================================
CREATE TABLE categories (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
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

ALTER TABLE
	categories
ADD
	CONSTRAINT categories_unique_name UNIQUE (user_id, entity_type, parent_id, name);

CREATE INDEX idx_categories_user_entity ON categories (user_id, entity_type);

CREATE INDEX idx_categories_parent ON categories (parent_id);

CREATE TRIGGER trigger_update_categories_updated_at BEFORE
UPDATE
	ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE
	categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own categories" ON categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================
-- NOTES
-- =============================================
CREATE TABLE notes (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
	title text NOT NULL CHECK (char_length(title) >= 1),
	description text,
	status text NOT NULL DEFAULT 'todo',
	category_id uuid REFERENCES categories(id) ON DELETE
	SET
		NULL,
		position text NOT NULL DEFAULT 'a0',
		created_at timestamptz NOT NULL DEFAULT now(),
		updated_at timestamptz NOT NULL DEFAULT now()
);

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

CREATE INDEX idx_notes_user_id ON notes (user_id);

CREATE INDEX idx_notes_user_position ON notes (user_id, position);

CREATE INDEX idx_notes_status ON notes (status);

CREATE INDEX idx_notes_category ON notes (category_id);

CREATE TRIGGER trigger_update_notes_updated_at BEFORE
UPDATE
	ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
-- TAGS (с entity_type скоупом сразу)
-- =============================================
CREATE TABLE tags (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
	entity_type text NOT NULL,
	name text NOT NULL CHECK (char_length(name) >= 1),
	color text DEFAULT '#6B7280',
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE
	tags
ADD
	CONSTRAINT tags_user_entity_name_unique UNIQUE (user_id, entity_type, name);

CREATE INDEX idx_tags_user_id ON tags (user_id);

CREATE INDEX idx_tags_user_entity ON tags (user_id, entity_type);

ALTER TABLE
	tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tags" ON tags FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================
-- ENTITY_TAGS (M2M полиморфная)
-- =============================================
CREATE TABLE entity_tags (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
	tag_id uuid REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
	entity_type text NOT NULL,
	entity_id uuid NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE
	entity_tags
ADD
	CONSTRAINT entity_tags_unique UNIQUE (tag_id, entity_type, entity_id);

CREATE INDEX idx_entity_tags_entity ON entity_tags (entity_type, entity_id);

CREATE INDEX idx_entity_tags_tag ON entity_tags (tag_id);

CREATE INDEX idx_entity_tags_user ON entity_tags (user_id);

-- ✅ REPLICA IDENTITY FULL — нужен для Realtime DELETE events
ALTER TABLE
	entity_tags REPLICA IDENTITY FULL;

ALTER TABLE
	entity_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own entity_tags" ON entity_tags FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime
ADD
	TABLE notes;

ALTER PUBLICATION supabase_realtime
ADD
	TABLE tags;

ALTER PUBLICATION supabase_realtime
ADD
	TABLE entity_tags;

ALTER PUBLICATION supabase_realtime
ADD
	TABLE categories;

-- =============================================
-- ДЕМО: Категории
-- =============================================
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

-- =============================================
-- ДЕМО: Заметки (30 шт, разные timestamps)
-- =============================================
INSERT INTO
	notes (
		user_id,
		title,
		description,
		status,
		position,
		created_at,
		updated_at
	)
VALUES
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Купить продукты',
		'Молоко, хлеб, яйца, сыр и овощи',
		'todo',
		'a0',
		now() - interval '29 hours',
		now() - interval '14 hours'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Подготовить презентацию',
		'Сделать слайды для встречи в пятницу',
		'in_progress',
		'a1',
		now() - interval '28 hours',
		now() - interval '13 hours'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Позвонить маме',
		'Поздравить с днём рождения',
		'todo',
		'a2',
		now() - interval '27 hours',
		now() - interval '12 hours'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Закончить рефакторинг auth',
		'Переписать middleware и добавить rate limiting',
		'review',
		'a3',
		now() - interval '26 hours',
		now() - interval '11 hours'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Отправить отчёт по проекту',
		'Подготовить PDF и отправить заказчику',
		'done',
		'a4',
		now() - interval '25 hours',
		now() - interval '10 hours'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Почитать книгу "Чистый код"',
		'Прочитать главу 5–7',
		'in_progress',
		'a5',
		now() - interval '24 hours',
		now() - interval '9 hours'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Оплатить интернет',
		'До 28 марта',
		'todo',
		'a6',
		now() - interval '23 hours',
		now() - interval '8 hours'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Разобрать старые заметки',
		NULL,
		'archived',
		'a7',
		now() - interval '22 hours',
		now() - interval '7 hours'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Придумать идеи для нового приложения',
		'Список из 10 идей',
		'todo',
		'a8',
		now() - interval '21 hours',
		now() - interval '6 hours'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Сходить в зал',
		'Тренировка ног + пресс',
		'done',
		'a9',
		now() - interval '20 hours',
		now() - interval '5 hours'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Составить список покупок на неделю',
		'Включить фрукты, овощи, курицу',
		'todo',
		'aA',
		now() - interval '19 hours',
		now() - interval '4 hours'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Выучить 20 новых слов по английскому',
		'Использовать Anki',
		'in_progress',
		'aB',
		now() - interval '18 hours',
		now() - interval '3 hours'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Подготовить отчёт для руководителя',
		'Метрики за март',
		'review',
		'aC',
		now() - interval '17 hours',
		now() - interval '2 hours'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Забронировать билеты в отпуск',
		'Москва — СПб на майские',
		'todo',
		'aD',
		now() - interval '16 hours',
		now() - interval '1 hour'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Написать статью про Supabase',
		'RLS и политики безопасности',
		'in_progress',
		'aE',
		now() - interval '15 hours',
		now() - interval '50 minutes'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Разобрать почту',
		'Ответить на все старые письма',
		'todo',
		'aF',
		now() - interval '14 hours',
		now() - interval '45 minutes'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Купить подарок Саше',
		'Что-то связанное с программированием',
		'todo',
		'aG',
		now() - interval '13 hours',
		now() - interval '40 minutes'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Пройти курс по Tailwind CSS',
		'Закончить модуль 4',
		'review',
		'aH',
		now() - interval '12 hours',
		now() - interval '35 minutes'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Организовать рабочее место',
		'Купить монитор и кресло',
		'done',
		'aI',
		now() - interval '11 hours',
		now() - interval '30 minutes'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Придумать название для проекта',
		'Современное и запоминающееся',
		'in_progress',
		'aJ',
		now() - interval '10 hours',
		now() - interval '25 minutes'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Сходить на пробежку',
		'5 км в парке',
		'todo',
		'aK',
		now() - interval '9 hours',
		now() - interval '20 minutes'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Обновить резюме',
		'Добавить Supabase и Next.js',
		'todo',
		'aL',
		now() - interval '8 hours',
		now() - interval '15 minutes'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Провести код-ревью PR #142',
		'Проверить безопасность',
		'review',
		'aM',
		now() - interval '7 hours',
		now() - interval '10 minutes'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Записаться к стоматологу',
		'На чистку и осмотр',
		'todo',
		'aN',
		now() - interval '6 hours',
		now() - interval '9 minutes'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Почитать "Atomic Habits"',
		'30+ страниц',
		'in_progress',
		'aO',
		now() - interval '5 hours',
		now() - interval '8 minutes'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Оплатить коммунальные услуги',
		'За февраль и март',
		'done',
		'aP',
		now() - interval '4 hours',
		now() - interval '7 minutes'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Создать дизайн главной страницы',
		'В Figma, светлая и тёмная тема',
		'review',
		'aQ',
		now() - interval '3 hours',
		now() - interval '6 minutes'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Написать план развития на квартал',
		'Цели по навыкам',
		'todo',
		'aR',
		now() - interval '2 hours',
		now() - interval '5 minutes'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Сделать уборку в квартире',
		'Генеральная уборка',
		'done',
		'aS',
		now() - interval '1 hour',
		now() - interval '3 minutes'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'Изучить новую фичу PostgreSQL 17',
		'Partitioning и JSON',
		'in_progress',
		'aT',
		now() - interval '30 minutes',
		now() - interval '1 minute'
	);

-- =============================================
-- ДЕМО: Теги (с entity_type)
-- =============================================
INSERT INTO
	tags (user_id, entity_type, name, color)
VALUES
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'notes',
		'Важное',
		'#EF4444'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'notes',
		'Личное',
		'#3B82F6'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'notes',
		'Работа',
		'#F59E0B'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'notes',
		'Учёба',
		'#10B981'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'notes',
		'Идеи',
		'#8B5CF6'
	),
	(
		'4c1a224d-bc95-4804-870c-7832a73462ad',
		'notes',
		'Срочно',
		'#DC2626'
	);

-- =============================================
-- ДЕМО: Привязка тегов к заметкам
-- =============================================
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
-- ГОТОВО!
-- =============================================