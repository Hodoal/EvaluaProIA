import React, { useState, useEffect } from 'react';
import { FileText, Brain, CheckCircle, Users, BookOpen, Star, ArrowRight, Zap, Shield, Clock, Award } from 'lucide-react';

const LandingPage = ({ onStartApp }) => {
  const [isVisible, setIsVisible] = useState({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({
              ...prev,
              [entry.target.id]: true
            }));
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('[data-animate]');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const AnimatedSection = ({ children, id, className = "", delay = 0 }) => (
    <div
      id={id}
      data-animate
      className={`transition-all duration-1000 ease-out ${
        isVisible[id] 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 font-sans">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md shadow-sm z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-2">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  EvaluAI Pro
                </h1>
                <p className="text-sm text-gray-600">Sistema de Evaluación Inteligente</p>
              </div>
            </div>
            
            <button
              onClick={onStartApp}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-full hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <AnimatedSection id="hero-title" delay={200}>
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 bg-clip-text text-transparent">
                Revoluciona
              </span>
              <br />
              <span className="text-gray-800">
                la Evaluación Educativa
              </span>
            </h1>
          </AnimatedSection>
          
          <AnimatedSection id="hero-subtitle" delay={400}>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Potenciado por IA avanzada, automatiza la corrección de tareas y proporciona 
              retroalimentación detallada en segundos
            </p>
          </AnimatedSection>

          <AnimatedSection id="hero-cta" delay={600}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button
                onClick={onStartApp}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-xl flex items-center space-x-2"
              >
                <span>Comenzar Ahora</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="border-2 border-indigo-300 text-indigo-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-indigo-50 transition-all duration-300">
                Ver Demo
              </button>
            </div>
          </AnimatedSection>

          <AnimatedSection id="hero-stats" delay={800}>
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600 mb-2">95%</div>
                <div className="text-gray-600">Precisión</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">10x</div>
                <div className="text-gray-600">Más Rápido</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600 mb-2">24/7</div>
                <div className="text-gray-600">Disponible</div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection id="features-title" className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Características Principales
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Descubre cómo EvaluAI Pro transforma la manera en que evalúas el trabajo de tus estudiantes
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: "IA Avanzada",
                description: "Evaluación inteligente con Gemini AI que comprende contexto y matices del contenido",
                color: "from-indigo-500 to-purple-500"
              },
              {
                icon: Zap,
                title: "Evaluación Instantánea",
                description: "Procesa múltiples documentos simultáneamente en cuestión de segundos",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: CheckCircle,
                title: "Retroalimentación Detallada",
                description: "Comentarios constructivos y específicos para cada criterio de evaluación",
                color: "from-indigo-500 to-cyan-500"
              },
              {
                icon: Shield,
                title: "Seguro y Confiable",
                description: "Tus datos están protegidos con las mejores prácticas de seguridad",
                color: "from-green-500 to-emerald-500"
              },
              {
                icon: BookOpen,
                title: "Multi-Asignatura",
                description: "Configura criterios personalizados para cualquier materia o disciplina",
                color: "from-orange-500 to-red-500"
              },
              {
                icon: Award,
                title: "Reportes Completos",
                description: "Analíticas detalladas del desempeño estudiantil y tendencias de calificación",
                color: "from-violet-500 to-purple-500"
              }
            ].map((feature, index) => (
              <AnimatedSection
                key={index}
                id={`feature-${index}`}
                delay={index * 150}
                className="group"
              >
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection id="benefits-content">
              <h2 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Beneficios para Educadores
              </h2>
              <div className="space-y-6">
                {[
                  {
                    icon: Clock,
                    title: "Ahorra Tiempo Valioso",
                    description: "Reduce el tiempo de corrección en un 90%, dedica más tiempo a la enseñanza personalizada"
                  },
                  {
                    icon: Users,
                    title: "Escalabilidad Total",
                    description: "Evalúa desde 10 hasta 1000 trabajos con la misma eficiencia y calidad"
                  },
                  {
                    icon: Star,
                    title: "Consistencia Garantizada",
                    description: "Criterios de evaluación uniformes que eliminan la subjetividad y el sesgo"
                  }
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 rounded-xl hover:bg-indigo-50 transition-all duration-300">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">{benefit.title}</h3>
                      <p className="text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection id="benefits-visual" delay={300}>
              <div className="relative">
                <div className="bg-gradient-to-r from-indigo-400 to-purple-500 rounded-3xl p-8 text-white shadow-2xl transform rotate-3">
                  <div className="bg-white/20 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                        <FileText className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-semibold">Evaluación Completada</div>
                        <div className="text-sm opacity-90">Matemáticas - Álgebra Lineal</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="bg-white/20 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm">Comprensión Conceptual</span>
                          <span className="font-semibold">9.2/10</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2">
                          <div className="bg-white rounded-full h-2 w-11/12"></div>
                        </div>
                      </div>
                      
                      <div className="bg-white/20 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm">Resolución de Problemas</span>
                          <span className="font-semibold">8.7/10</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2">
                          <div className="bg-white rounded-full h-2 w-4/5"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl p-4 shadow-xl border border-gray-100">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">2.3s</div>
                    <div className="text-sm text-gray-600">Tiempo de evaluación</div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <AnimatedSection id="cta-content">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              ¿Listo para Transformar tu Proceso de Evaluación?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Únete a miles de educadores que ya utilizan EvaluAI Pro para mejorar su eficiencia y la calidad de sus evaluaciones
            </p>
            <button
              onClick={onStartApp}
              className="bg-white text-indigo-600 px-10 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-xl inline-flex items-center space-x-3"
            >
              <span>Comenzar Gratis</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-2">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">EvaluAI Pro</h3>
                  <p className="text-gray-400 text-sm">Sistema de Evaluación Inteligente</p>
                </div>
              </div>
              <p className="text-gray-400 max-w-md">
                Revolucionando la educación através de la inteligencia artificial, 
                haciendo que la evaluación sea más eficiente, precisa y valiosa para educadores y estudiantes.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Producto</h4>
              <div className="space-y-2 text-gray-400">
                <div>Características</div>
                <div>Precios</div>
                <div>Demo</div>
                <div>Soporte</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <div className="space-y-2 text-gray-400">
                <div>Acerca de</div>
                <div>Blog</div>
                <div>Contacto</div>
                <div>Privacidad</div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 EvaluAI Pro. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;