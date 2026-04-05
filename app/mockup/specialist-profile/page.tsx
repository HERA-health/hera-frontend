"use client"

import { useState } from "react"
import Image from "next/image"
import {
  Star,
  MapPin,
  Video,
  Building2,
  Clock,
  Calendar,
  ChevronRight,
  Heart,
  Shield,
  Award,
  MessageCircle,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Phone,
  Globe,
  GraduationCap,
  Briefcase
} from "lucide-react"
import { cn } from "@/lib/utils"

// Mock data for the specialist
const specialist = {
  id: "1",
  name: "Judith Fernández Alonso",
  title: "Psicóloga General Sanitaria",
  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
  bio: "Soy psicóloga con más de 8 años de experiencia especializada en el tratamiento de la ansiedad, depresión y problemas de autoestima. Mi enfoque se basa en crear un espacio seguro donde puedas explorar tus emociones y desarrollar herramientas para mejorar tu bienestar emocional.",
  rating: 4.9,
  reviewCount: 127,
  pricePerSession: 60,
  specializations: ["Ansiedad", "Depresión", "Autoestima", "Estrés laboral", "Relaciones"],
  therapeuticApproach: "Terapia Cognitivo-Conductual (TCC), Mindfulness, ACT",
  experienceYears: 8,
  languages: ["Español", "Inglés", "Catalán"],
  collegiateNumber: "COL-28542",
  isOnline: true,
  isAvailableToday: true,
  nextAvailable: "Hoy a las 18:00",
  sessionTypes: ["VIDEO_CALL", "IN_PERSON"],
  address: {
    street: "Carrer del Llenguadoc, 50",
    city: "Barcelona",
    postalCode: "08001"
  },
  education: [
    { title: "Grado en Psicología", institution: "Universitat de Barcelona", year: "2014" },
    { title: "Máster en Psicología General Sanitaria", institution: "UAB", year: "2016" },
  ],
  schedule: {
    weekdays: "09:00 - 20:00",
    saturday: "10:00 - 14:00",
    sunday: "Cerrado"
  }
}

const reviews = [
  {
    id: "1",
    rating: 5,
    text: "Excelente profesional. Me ayudó mucho a entender y gestionar mi ansiedad. Muy recomendable.",
    authorName: "María G.",
    date: "Hace 2 semanas",
    verified: true
  },
  {
    id: "2",
    rating: 5,
    text: "Muy empática y profesional. Las sesiones son muy productivas y me siento escuchada.",
    authorName: "Carlos R.",
    date: "Hace 1 mes",
    verified: true
  },
  {
    id: "3",
    rating: 5,
    text: "Gran experiencia. El enfoque terapéutico es muy efectivo para mi situación.",
    authorName: "Ana P.",
    date: "Hace 1 mes",
    verified: true
  }
]

const specializationIcons: Record<string, string> = {
  "Ansiedad": "😰",
  "Depresión": "💙",
  "Autoestima": "💪",
  "Estrés laboral": "💼",
  "Relaciones": "💕"
}

const specializationDescriptions: Record<string, string> = {
  "Ansiedad": "Manejo del estrés, ataques de pánico y preocupaciones",
  "Depresión": "Acompañamiento en estados de ánimo bajo",
  "Autoestima": "Desarrollo de la confianza y amor propio",
  "Estrés laboral": "Bienestar y equilibrio en el trabajo",
  "Relaciones": "Comunicación y vínculos saludables"
}

export default function SpecialistProfileMockup() {
  const [isBookingHovered, setIsBookingHovered] = useState(false)

  return (
    <div className="min-h-screen bg-[#F8FAF8]">
      {/* Back Navigation */}
      <div className="sticky top-0 z-40 bg-[#F8FAF8]/80 backdrop-blur-md border-b border-[#E8EDE8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <button className="flex items-center gap-2 text-[#6B7B6B] hover:text-[#2C3E2C] transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Volver a especialistas</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-8">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Hero Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E8EDE8] overflow-hidden">
              {/* Header Gradient */}
              <div className="h-24 bg-gradient-to-br from-[#8B9D83]/20 via-[#B8A8D9]/10 to-[#8B9D83]/20" />
              
              {/* Profile Info */}
              <div className="px-6 sm:px-8 pb-6 -mt-12">
                <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-end">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-28 h-28 rounded-2xl overflow-hidden ring-4 ring-white shadow-lg">
                      <Image
                        src={specialist.avatar}
                        alt={specialist.name}
                        width={112}
                        height={112}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    {specialist.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full ring-3 ring-white flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </div>

                  {/* Name & Title */}
                  <div className="flex-1 pb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-semibold text-[#2C3E2C]">{specialist.name}</h1>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 rounded-full">
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs font-medium text-emerald-700">Verificada</span>
                      </div>
                    </div>
                    <p className="text-[#6B7B6B] mt-0.5">{specialist.title}</p>
                    
                    {/* Quick Stats */}
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <button className="flex items-center gap-1.5 group">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-[#2C3E2C]">{specialist.rating}</span>
                        <span className="text-[#6B7B6B] text-sm group-hover:text-[#2C3E2C] transition-colors">
                          ({specialist.reviewCount} reseñas)
                        </span>
                      </button>
                      <div className="flex items-center gap-1.5 text-sm text-[#6B7B6B]">
                        <Briefcase className="w-4 h-4" />
                        <span>{specialist.experienceYears} años de experiencia</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-5">
                  {specialist.specializations.slice(0, 4).map((spec, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 text-sm bg-[#F5F7F5] text-[#4A5D4A] rounded-lg font-medium"
                    >
                      {spec}
                    </span>
                  ))}
                  {specialist.specializations.length > 4 && (
                    <span className="px-3 py-1.5 text-sm bg-[#8B9D83]/10 text-[#8B9D83] rounded-lg font-medium">
                      +{specialist.specializations.length - 4} más
                    </span>
                  )}
                </div>

                {/* Session Types */}
                <div className="flex items-center gap-3 mt-5 pt-5 border-t border-[#E8EDE8]">
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F7F5] rounded-lg">
                    <Video className="w-4 h-4 text-[#8B9D83]" />
                    <span className="text-sm text-[#4A5D4A] font-medium">Videollamada</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F7F5] rounded-lg">
                    <Building2 className="w-4 h-4 text-[#8B9D83]" />
                    <span className="text-sm text-[#4A5D4A] font-medium">Presencial</span>
                  </div>
                  {specialist.isAvailableToday && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg ml-auto">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm text-emerald-700 font-medium">Disponible hoy</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* About Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E8EDE8] p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-[#2C3E2C] mb-4">Sobre mí</h2>
              <p className="text-[#4A5D4A] leading-relaxed">{specialist.bio}</p>
              
              <div className="mt-6 pt-6 border-t border-[#E8EDE8]">
                <h3 className="text-xs font-semibold text-[#9BA89B] uppercase tracking-wider mb-3">
                  Enfoque terapéutico
                </h3>
                <p className="text-[#4A5D4A]">{specialist.therapeuticApproach}</p>
              </div>

              <div className="mt-6 pt-6 border-t border-[#E8EDE8]">
                <h3 className="text-xs font-semibold text-[#9BA89B] uppercase tracking-wider mb-3">
                  Idiomas
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {specialist.languages.map((lang, index) => (
                    <span
                      key={index}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F7F5] rounded-lg text-sm text-[#4A5D4A]"
                    >
                      <Globe className="w-3.5 h-3.5 text-[#8B9D83]" />
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Specializations */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E8EDE8] p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-[#2C3E2C] mb-5">Áreas de especialización</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {specialist.specializations.map((spec, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 bg-[#F8FAF8] rounded-xl hover:bg-[#F0F4F0] transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform">
                      {specializationIcons[spec] || "🌿"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[#2C3E2C]">{spec}</h3>
                      <p className="text-sm text-[#6B7B6B] mt-0.5">
                        {specializationDescriptions[spec] || "Apoyo especializado en esta área"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Education & Credentials */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E8EDE8] p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-[#2C3E2C] mb-5">Formación y credenciales</h2>
              
              <div className="space-y-4">
                {specialist.education.map((edu, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#B8A8D9]/10 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-[#B8A8D9]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-[#2C3E2C]">{edu.title}</h3>
                      <p className="text-sm text-[#6B7B6B]">{edu.institution} · {edu.year}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-[#E8EDE8]">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Colegiada verificada</p>
                    <p className="text-xs text-emerald-600">Nº Colegiado: {specialist.collegiateNumber}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E8EDE8] p-6 sm:p-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[#2C3E2C]">Opiniones de pacientes</h2>
                <button className="text-sm text-[#8B9D83] font-medium hover:text-[#6E8066] transition-colors flex items-center gap-1">
                  Ver todas
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Rating Summary */}
              <div className="flex items-center gap-6 p-4 bg-[#F8FAF8] rounded-xl mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#2C3E2C]">{specialist.rating}</div>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-4 h-4",
                          i < Math.floor(specialist.rating)
                            ? "fill-amber-400 text-amber-400"
                            : "fill-gray-200 text-gray-200"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#6B7B6B]">{specialist.reviewCount} opiniones verificadas</p>
                  <p className="text-xs text-[#9BA89B] mt-1">98% de pacientes la recomiendan</p>
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 border border-[#E8EDE8] rounded-xl hover:border-[#D0D8D0] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#8B9D83]/10 flex items-center justify-center text-sm font-medium text-[#8B9D83]">
                          {review.authorName[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#2C3E2C]">{review.authorName}</span>
                            {review.verified && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    "w-3 h-3",
                                    i < review.rating
                                      ? "fill-amber-400 text-amber-400"
                                      : "fill-gray-200 text-gray-200"
                                  )}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-[#9BA89B]">· {review.date}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-[#4A5D4A] mt-3 leading-relaxed">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - Booking Card */}
          <div className="lg:sticky lg:top-20 lg:h-fit">
            <div className="bg-white rounded-2xl shadow-md border border-[#E8EDE8] overflow-hidden">
              {/* Price Header */}
              <div className="p-6 bg-gradient-to-br from-[#8B9D83] to-[#7A8C72] text-white">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{specialist.pricePerSession}€</span>
                  <span className="text-white/80">/sesión</span>
                </div>
                <p className="text-white/80 text-sm mt-1">Sesión de 50 minutos</p>
              </div>

              <div className="p-6 space-y-5">
                {/* Availability */}
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Próxima disponibilidad</p>
                    <p className="text-xs text-emerald-600">{specialist.nextAvailable}</p>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Video className="w-4 h-4 text-[#8B9D83]" />
                    <span className="text-[#4A5D4A]">Videollamada disponible</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="w-4 h-4 text-[#8B9D83]" />
                    <span className="text-[#4A5D4A]">Consulta presencial</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MessageCircle className="w-4 h-4 text-[#8B9D83]" />
                    <span className="text-[#4A5D4A]">Chat incluido entre sesiones</span>
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  className={cn(
                    "w-full py-4 rounded-xl font-semibold text-white transition-all",
                    "bg-[#8B9D83] hover:bg-[#7A8C72] hover:shadow-lg",
                    "active:scale-[0.98]"
                  )}
                  onMouseEnter={() => setIsBookingHovered(true)}
                  onMouseLeave={() => setIsBookingHovered(false)}
                >
                  Reservar sesión
                </button>

                {/* Secondary Action */}
                <button className="w-full py-3 rounded-xl font-medium text-[#8B9D83] border-2 border-[#8B9D83]/20 hover:border-[#8B9D83]/40 hover:bg-[#8B9D83]/5 transition-all flex items-center justify-center gap-2">
                  <Heart className="w-4 h-4" />
                  Guardar perfil
                </button>
              </div>

              {/* Location Section */}
              <div className="border-t border-[#E8EDE8] p-6">
                <h3 className="text-xs font-semibold text-[#9BA89B] uppercase tracking-wider mb-3">
                  Ubicación de consulta
                </h3>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F5F7F5] flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-[#8B9D83]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2C3E2C]">{specialist.address.street}</p>
                    <p className="text-sm text-[#6B7B6B]">{specialist.address.postalCode} {specialist.address.city}</p>
                  </div>
                </div>
                <button className="w-full mt-4 py-2.5 text-sm text-[#8B9D83] font-medium hover:bg-[#F5F7F5] rounded-lg transition-colors">
                  Ver en mapa
                </button>
              </div>

              {/* Schedule Section */}
              <div className="border-t border-[#E8EDE8] p-6">
                <h3 className="text-xs font-semibold text-[#9BA89B] uppercase tracking-wider mb-3">
                  Horario de atención
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6B7B6B]">Lunes - Viernes</span>
                    <span className="text-[#2C3E2C] font-medium">{specialist.schedule.weekdays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7B6B]">Sábado</span>
                    <span className="text-[#2C3E2C] font-medium">{specialist.schedule.saturday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7B6B]">Domingo</span>
                    <span className="text-[#9BA89B]">{specialist.schedule.sunday}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="mt-4 p-4 bg-[#F8FAF8] rounded-xl">
              <div className="flex items-center justify-center gap-6 text-xs text-[#6B7B6B]">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#8B9D83]" />
                  <span>Pago seguro</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#8B9D83]" />
                  <span>Garantía HERA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
