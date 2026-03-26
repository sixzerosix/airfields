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