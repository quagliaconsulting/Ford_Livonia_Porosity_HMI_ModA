--
-- Name: Regions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Regions" (
    id bigint NOT NULL,
    camera_id text NOT NULL,
    region_id text NOT NULL,
    size_threshold real NOT NULL,
    density_threshold integer NOT NULL,
    proximity_threshold real NOT NULL,
    polygon jsonb NOT NULL,
    part_number text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    description text
);

ALTER TABLE public."Regions" OWNER TO postgres;

--
-- Name: Regions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Regions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public."Regions_id_seq" OWNER TO postgres;

--
-- Name: Regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Regions_id_seq" OWNED BY public."Regions".id;

--
-- Name: Regions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Regions" ALTER COLUMN id SET DEFAULT nextval('public."Regions_id_seq"'::regclass);

--
-- Name: Regions Regions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Regions"
    ADD CONSTRAINT "Regions_pkey" PRIMARY KEY (id);

--
-- Name: Regions Regions_camera_region_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Regions"
    ADD CONSTRAINT "Regions_camera_region_unique" UNIQUE (camera_id, region_id);

--
-- Name: Regions camera_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Regions"
    ADD CONSTRAINT camera_fk FOREIGN KEY (camera_id) REFERENCES public."Cameras"(serial_number) NOT VALID;

--
-- Name: Regions part_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Regions"
    ADD CONSTRAINT part_fk FOREIGN KEY (part_number) REFERENCES public."Part_Information"(part_number) NOT VALID;