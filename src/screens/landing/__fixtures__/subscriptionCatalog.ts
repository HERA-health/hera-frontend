import type { SubscriptionCatalog } from '../../../services/subscriptionService';
export const subscriptionCatalogFixture = {
  "version": "2026-11-14",
  "enforced": true,
  "currency": "EUR",
  "taxIncluded": false,
  "trial": {
    "unit": "month",
    "count": 1
  },
  "activityDays": 60,
  "timeZone": "Europe/Madrid",
  "directoryCommissionsIndependent": true,
  "plans": [
    {
      "id": "DIRECTORIO",
      "name": "Directorio",
      "monthlyCents": 0,
      "ownPatientLimit": 0,
      "storageBytes": 5000000000,
      "rank": 0,
      "features": [
        "Pacientes del directorio",
        "Estadísticas completas",
        "Cartera anterior protegida"
      ],
      "presentation": {
        "description": "Recibe pacientes del directorio, sin cuota fija.",
        "documents": "Biblioteca según plan",
        "supervision": "No incluida",
        "templates": "No incluidas",
        "directoryProfile": "Incluido",
        "publications": "No incluidas",
        "support": "Estándar"
      }
    },
    {
      "id": "CALMA",
      "name": "Calma",
      "monthlyCents": 2999,
      "ownPatientLimit": 15,
      "storageBytes": 20000000000,
      "rank": 1,
      "features": [
        "15 pacientes propios activos o con plaza comprometida",
        "20 GB",
        "Plantillas Calma",
        "Estadísticas completas",
        "Una supervisión al mes y tres publicaciones estándar, gestionadas por HERA"
      ],
      "presentation": {
        "description": "Organiza tu consulta con apoyo para empezar.",
        "documents": "Nivel Calma",
        "supervision": "1 al mes",
        "templates": "Calma",
        "directoryProfile": "Incluido",
        "publications": "3 estándar",
        "support": "Estándar"
      }
    },
    {
      "id": "CRECIMIENTO",
      "name": "Crecimiento",
      "monthlyCents": 4999,
      "ownPatientLimit": 30,
      "storageBytes": 50000000000,
      "rank": 2,
      "features": [
        "30 pacientes propios activos o con plaza comprometida",
        "50 GB",
        "Plantillas Calma y Crecimiento",
        "Estadísticas completas",
        "Tres supervisiones al mes y cinco publicaciones personalizadas, gestionadas por HERA",
        "Soporte prioritario gestionado por HERA"
      ],
      "presentation": {
        "description": "Más supervisión y publicaciones personalizadas.",
        "documents": "Calma y Crecimiento",
        "supervision": "3 al mes",
        "templates": "Calma y Crecimiento",
        "directoryProfile": "Incluido",
        "publications": "5 personalizadas",
        "support": "Priorizado"
      }
    },
    {
      "id": "HORIZONTE",
      "name": "Horizonte",
      "monthlyCents": 6999,
      "ownPatientLimit": null,
      "storageBytes": 2000000000000,
      "rank": 3,
      "features": [
        "Pacientes propios ilimitados",
        "2 TB",
        "Todas las plantillas",
        "Estadísticas completas",
        "Distintivo y rotación destacada",
        "Publicaciones, supervisión y soporte prioritario gestionados por HERA"
      ],
      "presentation": {
        "description": "Pacientes propios sin límite y presencia destacada.",
        "documents": "Todos los niveles",
        "supervision": "Incluida",
        "templates": "Todos los niveles",
        "directoryProfile": "Distintivo y rotación destacada",
        "publications": "Incluidas",
        "support": "Priorizado"
      }
    }
  ]
} satisfies SubscriptionCatalog;
