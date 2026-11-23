-- ============================================================================
-- Схема базы данных PostgreSQL для СППР контроля коррозии оборудования
-- ============================================================================

-- Типы перечислений (ENUM) для строгой целостности данных
CREATE TYPE risk_status AS ENUM ('normal', 'warning', 'critical');
CREATE TYPE corrosion_mechanism AS ENUM (
    'pitting',          -- Питтинговая коррозия
    'erosion',          -- Эрозия-коррозия
    'scc',              -- Коррозионное растрескивание под напряжением (КРН)
    'sulfidation',      -- Сульфидная коррозия
    'uniform',          -- Общая равномерная коррозия
    'under_insulation'  -- Коррозия под изоляцией (CUI)
);

-- 1. Таблица оборудования (Equipment)
CREATE TABLE equipment (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_number          VARCHAR(50) UNIQUE NOT NULL,          -- Например: 'ТР-102-А', 'К-101'
    name                VARCHAR(255) NOT NULL,                -- Наименование оборудования
    unit_name           VARCHAR(100) NOT NULL,                -- Технологический узел (АВТ-3, Установка ГФУ)
    plant_area          VARCHAR(100) NOT NULL,                -- Производство / цех
    equipment_type      VARCHAR(50) NOT NULL,                 -- 'pipeline' | 'vessel' | 'heat_exchanger' | 'reactor'
    material_grade      VARCHAR(100) NOT NULL,                -- Марка стали (например, 09Г2С, 12Х18Н10Т)
    
    -- Геометрические и проектные параметры (в мм)
    nominal_thickness   NUMERIC(6, 2) NOT NULL CHECK (nominal_thickness > 0),
    min_thickness       NUMERIC(6, 2) NOT NULL CHECK (min_thickness > 0), -- t_min (отбраковочная толщина)
    current_thickness   NUMERIC(6, 2) NOT NULL,
    
    -- Параметры деградации и риска
    corrosion_rate      NUMERIC(6, 3) NOT NULL DEFAULT 0.0,   -- Скорость коррозии (мм/год)
    remaining_life_yrs  NUMERIC(6, 2),                        -- Остаточный ресурс (лет)
    probability_score   SMALLINT NOT NULL CHECK (probability_score BETWEEN 1 AND 5), -- Ось X матрицы 5x5
    consequence_score   SMALLINT NOT NULL CHECK (consequence_score BETWEEN 1 AND 5), -- Ось Y матрицы 5x5
    risk_status         risk_status NOT NULL DEFAULT 'normal',
    primary_mechanism   corrosion_mechanism NOT NULL,
    
    -- График инспекций
    last_inspection_at  DATE,
    next_inspection_at  DATE NOT NULL,
    
    -- Координаты для 2D-карты и 3D-двойника
    map_x               NUMERIC(5, 2),
    map_y               NUMERIC(5, 2),
    model_node_id       VARCHAR(100),                         -- ID меша в 3D-модели (GLTF/GLB)
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Таблица инспекций / проверок (Inspections)
CREATE TABLE inspections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id        UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    inspection_date     DATE NOT NULL,
    inspector_name      VARCHAR(150) NOT NULL,
    method              VARCHAR(100) NOT NULL,                -- УЗТ (Ультразвуковая толщинометрия), ВИК, РК
    summary_tags        JSONB NOT NULL DEFAULT '[]'::jsonb,   -- Теги: ["Питтинг", "Риск: Высокий"]
    findings            TEXT,                                 -- Текстовое заключение
    defect_photo_url    TEXT,                                 -- Ссылка на фото дефекта (язва, трещина)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Таблица замеров толщины стенки (Measurements)
CREATE TABLE measurements (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id        UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    inspection_id       UUID REFERENCES inspections(id) ON DELETE SET NULL,
    measured_at         DATE NOT NULL,
    thickness_mm        NUMERIC(6, 2) NOT NULL CHECK (thickness_mm >= 0),
    measurement_point   VARCHAR(50) DEFAULT 'T1',             -- Точка контроля (T1, T2, Отвод-1)
    temperature_c       NUMERIC(5, 1),                        -- Рабочая температура при замере
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы для быстрого построения дашборда и фильтрации реестра
CREATE INDEX idx_equipment_risk_status ON equipment(risk_status);
CREATE INDEX idx_equipment_next_inspection ON equipment(next_inspection_at);
CREATE INDEX idx_measurements_eq_date ON measurements(equipment_id, measured_at ASC);
CREATE INDEX idx_inspections_eq_date ON inspections(equipment_id, inspection_date DESC);
