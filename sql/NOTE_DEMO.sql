-- =============================================
-- ТАБЛИЦА ЗАМЕТОК (Notes) — Полная версия 2026
-- =============================================
CREATE TABLE notes (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid REFERENCES auth.users NOT NULL,
	title text NOT NULL CHECK (char_length(title) >= 1),
	description text,
	status text NOT NULL DEFAULT 'todo',
	position integer NOT NULL,
	-- для drag-and-drop (dnd-kit)
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- ОГРАНИЧЕНИЯ
-- =============================================
-- Разрешённые статусы
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

-- Индексы для быстрой работы (очень важны!)
CREATE INDEX idx_notes_user_id ON notes (user_id);

CREATE INDEX idx_notes_user_position ON notes (user_id, position);

-- основной для сортировки
CREATE INDEX idx_notes_status ON notes (status);

-- =============================================
-- ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ updated_at
-- =============================================
CREATE
OR REPLACE FUNCTION update_updated_at_column() RETURNS trigger AS $ $ BEGIN NEW.updated_at = now();

RETURN NEW;

END;

$ $ language plpgsql;

CREATE TRIGGER trigger_update_notes_updated_at BEFORE
UPDATE
	ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE
	notes ENABLE ROW LEVEL SECURITY;

-- Политики доступа (только владелец может работать со своими заметками)
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
-- ДЕМО-ДАННЫЕ (24 + 10 заметок)
-- =============================================
-- Сначала вставляем демо-данные без position (чтобы потом пронумеровать)
INSERT INTO
	notes (user_id, title, description, status)
SELECT
	auth.uid(),
	-- вставляем под текущим авторизованным пользователем
	title,
	description,
	status
FROM
	(
		VALUES
			(
				'Купить продукты',
				'Молоко, хлеб, яйца, сыр и овощи',
				'todo'
			),
			(
				'Подготовить презентацию',
				'Сделать слайды для встречи в пятницу',
				'in_progress'
			),
			(
				'Позвонить маме',
				'Поздравить с днём рождения',
				'todo'
			),
			(
				'Закончить рефакторинг auth',
				'Переписать middleware и добавить rate limiting',
				'review'
			),
			(
				'Отправить отчёт по проекту',
				'Подготовить PDF и отправить заказчику',
				'done'
			),
			(
				'Почитать книгу "Чистый код"',
				'Прочитать главу 5–7',
				'in_progress'
			),
			('Оплатить интернет', 'До 28 марта', 'todo'),
			('Разобрать старые заметки', NULL, 'archived'),
			(
				'Придумать идеи для нового приложения',
				'Список из 10 идей',
				'todo'
			),
			(
				'Сходить в зал',
				'Тренировка ног + пресс',
				'done'
			),
			(
				'Составить список покупок на неделю',
				'Включить фрукты, овощи, курицу',
				'todo'
			),
			(
				'Выучить 20 новых слов по английскому',
				'Использовать Anki',
				'in_progress'
			),
			(
				'Подготовить отчёт для руководителя',
				'Метрики за март',
				'review'
			),
			(
				'Забронировать билеты в отпуск',
				'Москва — СПб на майские',
				'todo'
			),
			(
				'Написать статью про Supabase',
				'RLS и политики безопасности',
				'in_progress'
			),
			(
				'Разобрать почту',
				'Ответить на все старые письма',
				'todo'
			),
			(
				'Купить подарок Саше',
				'Что-то связанное с программированием',
				'todo'
			),
			(
				'Пройти курс по Tailwind CSS',
				'Закончить модуль 4',
				'review'
			),
			(
				'Организовать рабочее место',
				'Купить монитор и кресло',
				'done'
			),
			(
				'Придумать название для проекта',
				'Современное и запоминающееся',
				'in_progress'
			),
			('Сходить на пробежку', '5 км в парке', 'todo'),
			(
				'Обновить резюме',
				'Добавить Supabase и Next.js',
				'todo'
			),
			(
				'Провести код-ревью PR #142',
				'Проверить безопасность',
				'review'
			),
			(
				'Записаться к стоматологу',
				'На чистку и осмотр',
				'todo'
			),
			(
				'Почитать "Atomic Habits"',
				'30+ страниц',
				'in_progress'
			),
			(
				'Оплатить коммунальные услуги',
				'За февраль и март',
				'done'
			),
			(
				'Создать дизайн главной страницы',
				'В Figma, светлая и тёмная тема',
				'review'
			),
			(
				'Написать план развития на квартал',
				'Цели по навыкам',
				'todo'
			),
			(
				'Сделать уборку в квартире',
				'Генеральная уборка',
				'done'
			),
			(
				'Изучить новую фичу PostgreSQL 17',
				'Partitioning и JSON',
				'in_progress'
			)
	) AS demo(title, description, status);

-- Теперь пронумеровываем position по порядку создания для каждого пользователя
UPDATE
	notes
SET
	position = sub.rn - 1
FROM
	(
		SELECT
			id,
			ROW_NUMBER() OVER (
				PARTITION BY user_id
				ORDER BY
					created_at ASC
			) as rn
		FROM
			notes
	) sub
WHERE
	notes.id = sub.id;

-- =============================================
-- ГОТОВО!
-- =============================================
-- Проверить результат
-- SELECT id, title, status, position, created_at 
-- FROM notes 
-- ORDER BY user_id, position;