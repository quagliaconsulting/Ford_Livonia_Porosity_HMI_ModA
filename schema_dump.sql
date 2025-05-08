--
-- PostgreSQL database dump
--

-- Dumped from database version 16.6
-- Dumped by pg_dump version 16.8 (Ubuntu 16.8-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Cameras; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Cameras" (
    serial_number text NOT NULL,
    group_id integer,
    sub_group integer,
    ip text
);


ALTER TABLE public."Cameras" OWNER TO postgres;

--
-- Name: Current_Part; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Current_Part" (
    id bigint NOT NULL,
    "timestamp" timestamp with time zone,
    belt text,
    part text
);


ALTER TABLE public."Current_Part" OWNER TO postgres;

--
-- Name: Current_Part_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Current_Part_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Current_Part_id_seq" OWNER TO postgres;

--
-- Name: Current_Part_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Current_Part_id_seq" OWNED BY public."Current_Part".id;


--
-- Name: Defects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Defects" (
    id bigint NOT NULL,
    image bigint,
    x integer,
    y integer,
    width integer,
    height integer,
    confidence real,
    type text,
    hand text,
    uss_reviewed boolean,
    system_generated boolean,
    disposition text,
    dispositioned_at timestamp with time zone,
    supression_timestamp timestamp with time zone,
    mode text,
    iv_updated boolean,
    metadata jsonb
);


ALTER TABLE public."Defects" OWNER TO postgres;

--
-- Name: Defects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Defects_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Defects_id_seq" OWNER TO postgres;

--
-- Name: Defects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Defects_id_seq" OWNED BY public."Defects".id;


--
-- Name: HumanInspect; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."HumanInspect" (
    id bigint NOT NULL,
    scan_id text,
    part_suffix text,
    serial_no text,
    julian_date text,
    cast_id_1 integer,
    cast_id_2 integer,
    cast_id_3 integer,
    defect_area text,
    size text,
    impreg text,
    location_row integer,
    location_column integer,
    pass_fail text,
    scan_datetime timestamp without time zone,
    file_name text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."HumanInspect" OWNER TO postgres;

--
-- Name: HumanInspect_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."HumanInspect_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."HumanInspect_id_seq" OWNER TO postgres;

--
-- Name: HumanInspect_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."HumanInspect_id_seq" OWNED BY public."HumanInspect".id;


--
-- Name: Images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Images" (
    id bigint NOT NULL,
    trigger bigint,
    width integer,
    height integer,
    camera text,
    media_id text,
    image text,
    ether_checked boolean
);


ALTER TABLE public."Images" OWNER TO postgres;

--
-- Name: Images_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Images_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Images_id_seq" OWNER TO postgres;

--
-- Name: Images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Images_id_seq" OWNED BY public."Images".id;


--
-- Name: Outflow; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Outflow" (
    id bigint NOT NULL,
    job_num integer,
    total_outflow integer,
    job_start timestamp without time zone,
    job_end timestamp without time zone,
    created_at timestamp without time zone
);


ALTER TABLE public."Outflow" OWNER TO postgres;

--
-- Name: Outflow_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Outflow_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Outflow_id_seq" OWNER TO postgres;

--
-- Name: Outflow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Outflow_id_seq" OWNED BY public."Outflow".id;


--
-- Name: Part_Information; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Part_Information" (
    id integer NOT NULL,
    model text,
    part_name text,
    part_number text,
    packout_amount integer,
    length numeric,
    job_num text
);


ALTER TABLE public."Part_Information" OWNER TO postgres;

--
-- Name: Part_Information_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Part_Information_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Part_Information_id_seq" OWNER TO postgres;

--
-- Name: Part_Information_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Part_Information_id_seq" OWNED BY public."Part_Information".id;


--
-- Name: Suppressed_Defects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Suppressed_Defects" (
    id bigint NOT NULL,
    defect bigint,
    suppressed_by bigint,
    similarity numeric
);


ALTER TABLE public."Suppressed_Defects" OWNER TO postgres;

--
-- Name: Triggers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Triggers" (
    id bigint NOT NULL,
    "timestamp" timestamp with time zone,
    label integer,
    part_instance text,
    belt text,
    part text
);


ALTER TABLE public."Triggers" OWNER TO postgres;

--
-- Name: Triggers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Triggers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Triggers_id_seq" OWNER TO postgres;

--
-- Name: Triggers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Triggers_id_seq" OWNED BY public."Triggers".id;


--
-- Name: processed_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.processed_files (
    filename character varying NOT NULL,
    processed_at timestamp without time zone NOT NULL
);


ALTER TABLE public.processed_files OWNER TO postgres;

--
-- Name: Current_Part id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Current_Part" ALTER COLUMN id SET DEFAULT nextval('public."Current_Part_id_seq"'::regclass);


--
-- Name: Defects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Defects" ALTER COLUMN id SET DEFAULT nextval('public."Defects_id_seq"'::regclass);


--
-- Name: HumanInspect id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."HumanInspect" ALTER COLUMN id SET DEFAULT nextval('public."HumanInspect_id_seq"'::regclass);


--
-- Name: Images id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Images" ALTER COLUMN id SET DEFAULT nextval('public."Images_id_seq"'::regclass);


--
-- Name: Outflow id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Outflow" ALTER COLUMN id SET DEFAULT nextval('public."Outflow_id_seq"'::regclass);


--
-- Name: Part_Information id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Part_Information" ALTER COLUMN id SET DEFAULT nextval('public."Part_Information_id_seq"'::regclass);


--
-- Name: Triggers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Triggers" ALTER COLUMN id SET DEFAULT nextval('public."Triggers_id_seq"'::regclass);


--
-- Name: Cameras Cameras_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Cameras"
    ADD CONSTRAINT "Cameras_pkey" PRIMARY KEY (serial_number);


--
-- Name: Current_Part Current_Part_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Current_Part"
    ADD CONSTRAINT "Current_Part_pkey" PRIMARY KEY (id);


--
-- Name: Defects Defects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Defects"
    ADD CONSTRAINT "Defects_pkey" PRIMARY KEY (id);


--
-- Name: HumanInspect HumanInspect_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."HumanInspect"
    ADD CONSTRAINT "HumanInspect_pkey" PRIMARY KEY (id);


--
-- Name: Images Images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Images"
    ADD CONSTRAINT "Images_pkey" PRIMARY KEY (id);


--
-- Name: Outflow Outflow_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Outflow"
    ADD CONSTRAINT "Outflow_pkey" PRIMARY KEY (id);


--
-- Name: Part_Information Part_Information_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Part_Information"
    ADD CONSTRAINT "Part_Information_pkey" PRIMARY KEY (id);


--
-- Name: Suppressed_Defects Suppressed_Defects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Suppressed_Defects"
    ADD CONSTRAINT "Suppressed_Defects_pkey" PRIMARY KEY (id);


--
-- Name: Triggers Triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Triggers"
    ADD CONSTRAINT "Triggers_pkey" PRIMARY KEY (id);


--
-- Name: processed_files processed_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processed_files
    ADD CONSTRAINT processed_files_pkey PRIMARY KEY (filename);


--
-- Name: Outflow unique_job_numb_job_start ; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Outflow"
    ADD CONSTRAINT "unique_job_numb_job_start " UNIQUE (job_num, job_start);


--
-- Name: Images camera_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Images"
    ADD CONSTRAINT camera_fk FOREIGN KEY (camera) REFERENCES public."Cameras"(serial_number) NOT VALID;


--
-- Name: Defects image_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Defects"
    ADD CONSTRAINT image_fk FOREIGN KEY (image) REFERENCES public."Images"(id) NOT VALID;


--
-- Name: Images trigger_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Images"
    ADD CONSTRAINT trigger_fk FOREIGN KEY (trigger) REFERENCES public."Triggers"(id) NOT VALID;


--
-- Name: my_publication; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION my_publication FOR ALL TABLES WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION my_publication OWNER TO postgres;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

