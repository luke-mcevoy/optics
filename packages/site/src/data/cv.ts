// Source of truth: Luke's resume (Oct 2025). Keep entries verbatim-accurate;
// trim resume bullets for the web, never embellish them.

export interface Degree {
  degree: string;
  field: string;
  school: string;
  place: string;
  date: string;
}

export interface Role {
  title: string;
  org: string;
  place: string;
  dates: string;
  bullets: string[];
}

export interface Publication {
  authors: string;
  title: string;
  venue: string;
  year: number;
  href: string;
  note?: string | undefined;
}

export const CONTACT = {
  name: 'Luke McEvoy',
  location: 'New York, NY',
  email: 'Lukemcevoy7@hotmail.com',
  github: 'https://github.com/luke-mcevoy',
  linkedin: 'https://www.linkedin.com/in/luke-mcevoy',
  resumePdf: '/Luke-McEvoy-Resume.pdf',
};

export const EDUCATION: Degree[] = [
  {
    degree: 'Ph.D.',
    field: 'Physics',
    school: 'Stevens Institute of Technology',
    place: 'Hoboken, NJ',
    date: 'May 2026',
  },
  {
    degree: 'M.S.',
    field: 'Machine Learning',
    school: 'Stevens Institute of Technology',
    place: 'Hoboken, NJ',
    date: 'May 2023',
  },
  {
    degree: 'B.S.',
    field: 'Computer Science',
    school: 'Stevens Institute of Technology',
    place: 'Hoboken, NJ',
    date: 'May 2022',
  },
];

export const AWARDS: string[] = [
  'Best Student Paper Presentation, SPIE Photonics Europe 2024',
  'Presidential Scholarship, Stevens Institute of Technology',
  'Eagle Scout',
];

export const EXPERIENCE: Role[] = [
  {
    title: 'Core Team, MHS Laser Stabilization Pilot',
    org: 'QuEra Computing',
    place: '',
    dates: '2026',
    bullets: [
      'Core team on QuEra\u2019s pilot under Anthropic\u2019s newly announced Model Hardware Standard (MHS), which lets AI agents operate physical lab hardware and run experiments; worked across MHS integration and laser systems.',
      'The pilot targeted laser locking \u2014 holding lasers at the precise frequencies a neutral-atom quantum computer needs to operate.',
      'Laser lock recovery improved from 58% to 99.3%, and recovery time dropped from ~150 seconds to ~6 seconds, proven across 700 blind trials.',
    ],
  },
  {
    title: 'Software Engineer Intern',
    org: 'Tesla',
    place: 'Palo Alto, CA',
    dates: 'Jun – Sep 2025',
    bullets: [
      'Made Autopilot\u2019s AI map-generation pipeline 350\u00d7 faster by parallelizing satellite/GPS/label ingestion across Kubernetes pods \u2014 preprocessing 400k images went from 56 hours to 10 minutes.',
      'Deployed a robotaxi rider-behavior auditing system (Golang, TypeScript, React, Kafka, AWS, Kubernetes) and a geofenced garage-door system driven by real-time telemetry.',
      'Second-highest contributor on a 10-engineer team rewriting Tesla\u2019s authentication codebase; cut Argo CI test time by 50%, saving ~60 engineering hours per day.',
    ],
  },
  {
    title: 'Research / Teaching Assistant',
    org: 'Stevens Institute of Technology',
    place: 'Hoboken, NJ',
    dates: 'Jan 2023 – present',
    bullets: [
      'PhD fully funded by a $15M Department of Defense grant; taught three sections of Mechanics (PEP 111) with 80+ students.',
      'Invented the Physics-Informed Masked Autoencoder (PI-MAE): single-photon LiDAR reconstruction from as few as 9 photons per pixel at 90% physical masking, outperforming Navier\u2013Stokes and Fast Marching inpainting.',
      'Developed VideoPI-MAE for dynamic 3D scenes \u2014 50\u00d7 faster imaging at 98% masking with MEMS-driven sparse sampling and spatiotemporal transformers.',
      'Built and operated the full single-photon LiDAR stack: 6 ps mode-locked lasers at 1554\u20131556 nm, DWDM filtering, MEMS beam steering, PPLN waveguide upconversion, SPAD detection, FPGA control.',
    ],
  },
  {
    title: 'Machine Learning Engineer',
    org: 'Quantum Computing Inc.',
    place: 'Hoboken, NJ',
    dates: 'May 2023 – May 2024',
    bullets: [
      'Designed ML pipelines for quantum single-photon LiDAR: 99% material-recognition accuracy from SPAD time-of-flight histograms, holding 89% through 15.2 OD obscurants.',
      'Developed the nonlinear-optical system for a single-photon vibrometer \u2014 1554\u20131585 nm picosecond pulses, DWDM filtering, MEMS steering, SPAD detection \u2014 for remote vibration sensing.',
      'Built optics and ML for surface-roughness metrology from single-photon speckle statistics, resolving 1.2 \u03bcm to 102 \u03bcm at range.',
    ],
  },
  {
    title: 'Software Engineer Intern',
    org: 'ASML',
    place: 'San Diego, CA',
    dates: 'Jun – Aug 2021',
    bullets: [
      'Implemented a multithreaded streaming interface in ASML\u2019s $160M EUV lithography machine, making signal writing 1,667% more efficient (C, C++, Python, VxWorks).',
      'Extended the hardware simulator for the EUV light source\u2019s embedded systems, saving an estimated 240 engineering hours per year.',
    ],
  },
  {
    title: 'Software Engineer ML Intern',
    org: 'Lenovo',
    place: 'Raleigh, NC',
    dates: 'Jan – Jun 2022',
    bullets: [
      'Built a full-stack client-acquisition application that scrapes and visualizes UCC and SEC filings so TruScale sales representatives can target competitors\u2019 expiring leases.',
    ],
  },
  {
    title: 'Chief Technology Officer',
    org: 'CastlePoint Analytics',
    place: 'Hoboken, NJ',
    dates: 'Aug 2020 – Jun 2021',
    bullets: [
      'Built the MVP that secured first-round VC funding; ML model predicted MMA fights at 72%, earning 160 paying customers. Led six engineers; company acquired May 2021.',
    ],
  },
];

export const PUBLICATIONS: Publication[] = [
  {
    authors: 'L. McEvoy, D. Tafone, Y. M. Sua, Y. Huang',
    title:
      'Video Physics-Informed Masked Autoencoder for High-Speed Single-Photon Imaging of Dynamic 3D Scenes',
    venue: 'CLEO: Applications and Technology',
    year: 2025,
    href: 'https://doi.org/10.1364/cleo_at.2025.aa133_5',
  },
  {
    authors: 'L. McEvoy, D. Tafone, Y. M. Sua, Y. Huang',
    title: 'Physics-Informed Masked Autoencoder for Active Sparse Imaging',
    venue: 'Scientific Reports',
    year: 2024,
    href: 'https://doi.org/10.1038/s41598-024-71095-x',
  },
  {
    authors: 'L. McEvoy, D. Tafone, Y. M. Sua, Y. Huang',
    title:
      'Inpainting Sparse Scenes through Physics Aware Transformers for Single-Photon LiDAR',
    venue: 'SPIE Photonics Europe',
    year: 2024,
    href: 'https://doi.org/10.1117/12.3014641',
    note: 'Best Student Paper Presentation Award',
  },
  {
    authors: 'L. McEvoy, D. Tafone, Y. M. Sua, Y. Huang',
    title: 'Sparse Single Photon Reconstruction through Masked Autoencoder',
    venue: 'Frontiers in Optics + Laser Science, JW4A.86',
    year: 2023,
    href: 'https://doi.org/10.1364/FIO.2023.JW4A.86',
  },
  {
    authors: 'D. Tafone, L. McEvoy, Y. M. Sua, P. Rehain, Y. Huang',
    title: 'Surface Material Recognition through Machine Learning using Time of Flight LiDAR',
    venue: 'Optics Continuum 2, 1813\u20131824',
    year: 2023,
    href: 'https://doi.org/10.1364/OPTCON.492258',
  },
  {
    authors: 'D. Tafone, L. McEvoy, Y. M. Sua, P. Rehain, Y. Huang',
    title: 'Material Recognition using Time of Flight LiDAR Surface Analysis',
    venue: 'Proc. SPIE Quantum Sensing, Imaging, and Precision Metrology',
    year: 2023,
    href: 'https://doi.org/10.1117/12.2652945',
  },
];

export const SKILLS: { label: string; items: string }[] = [
  {
    label: 'Optics & photonics',
    items:
      'Single-photon LiDAR (SPAD, ToF histograms), mode-locked ultrafast lasers, DWDM filtering, MEMS beam steering, nonlinear optics, quantum frequency conversion, single-photon vibrometry, FPGA control',
  },
  {
    label: 'Machine learning',
    items:
      'PyTorch, TensorFlow, transformers, masked autoencoders, PointNet++, CNNs, SAM, scikit-learn, OpenCV',
  },
  {
    label: 'Languages',
    items: 'Python, C++, Golang, C, TypeScript, JavaScript, SQL, Java, R, MATLAB',
  },
  {
    label: 'Cloud & systems',
    items: 'AWS, GCP, Kubernetes, Docker, Argo CI/CD, Kafka, Redis, Linux, VxWorks, React, Next.js, Node.js',
  },
];
