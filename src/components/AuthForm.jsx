import React, { useState } from 'react';
import { FileText, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

// Paleta pastel púrpura
const pastelBg = "from-[#f3e8ff] via-[#ede9fe] to-[#f5f3ff]";
const pastelAccent = "bg-[#c4b5fd]";
const pastelAccentHover = "bg-[#a78bfa]";
const pastelText = "text-[#7c3aed]";

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const AuthForm = ({ setUser }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let userCredential;
      let finalUserData;

      if (isLogin) { // Lógica de inicio de sesión
        userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        const newUserDataFromAuth = {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          name: userCredential.user.displayName || userCredential.user.email,
          role: "teacher"
        };

        const existingUserJSON = localStorage.getItem(`user_${userCredential.user.uid}`);
        const existingUser = existingUserJSON ? JSON.parse(existingUserJSON) : null;

        // Si es el mismo usuario, mezcla los datos. Los datos de localStorage (perfil editado) tienen prioridad.
        if (existingUser && existingUser.id === userCredential.user.uid) {
          finalUserData = { ...newUserDataFromAuth, ...existingUser };
        } else {
          finalUserData = newUserDataFromAuth;
        }
      } else { // Lógica de registro
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Las contraseñas no coinciden');
        }
        userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await updateProfile(userCredential.user, { displayName: formData.name });
        finalUserData = {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          name: userCredential.user.displayName || formData.name || userCredential.user.email,
          role: "teacher"
        };
      }
      setUser(finalUserData);
      localStorage.setItem(`user_${finalUserData.id}`, JSON.stringify(finalUserData));
      localStorage.setItem('last_logged_in_user_id', finalUserData.id);
    } catch (error) {
      setError(error.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      const newUserDataFromAuth = {
        id: userCredential.user.uid,
        email: userCredential.user.email,
        name: userCredential.user.displayName || userCredential.user.email,
        role: "teacher",
        photo: userCredential.user.photoURL // Estandarizamos a 'photo'
      };

      const existingUserJSON = localStorage.getItem(`user_${userCredential.user.uid}`);
      let finalUserData = newUserDataFromAuth;

      if (existingUserJSON) {
        const existingUser = JSON.parse(existingUserJSON);
        if (existingUser.id === userCredential.user.uid) {
          // Mezcla de datos, dando prioridad a lo que ya está guardado en localStorage (nombre, foto, etc.)
          finalUserData = { ...newUserDataFromAuth, ...existingUser };
        }
      }
      setUser(finalUserData);
      localStorage.setItem(`user_${finalUserData.id}`, JSON.stringify(finalUserData));
      localStorage.setItem('last_logged_in_user_id', finalUserData.id);
    } catch (error) {
      setError(error.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  };

  // Animación de transición minimalista
  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${pastelBg} transition-colors duration-700`}>
      {/* Bienvenida animada */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm transition-all duration-700 animate-fade-in">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-[#a78bfa] animate-bounce" />
            <h1 className="text-3xl font-bold text-[#7c3aed] mb-2 animate-fade-in-down">¡Bienvenido!</h1>
            <p className="text-lg text-[#7c3aed]/80 animate-fade-in-up">Sistema de Evaluación con IA</p>
          </div>
        </div>
      )}

      {/* Card con transición */}
      <div className={`w-full max-w-md bg-white/90 rounded-2xl shadow-xl p-8 border border-[#ede9fe] transition-all duration-500 ${showWelcome ? 'scale-95 blur-sm opacity-0' : 'scale-100 blur-0 opacity-100'}`}>
        <div className="text-center mb-8">
          <FileText className="w-10 h-10 mx-auto text-[#a78bfa] mb-2" />
          <h1 className={`text-2xl font-bold ${pastelText} mb-1`}>Sistema de Evaluación</h1>
          <p className="text-[#a78bfa] text-sm">
            {isLogin ? "Plataforma de evaluación automática potenciada por IA" : "Potenciado por IA"}
          </p>
        </div>

        {/* Transición minimalista entre login y registro */}
        <div className="relative min-h-[400px]">
          {/* Login */}
          <div className={`absolute inset-0 transition-all duration-500 ${isLogin ? 'opacity-100 translate-x-0 z-10 pointer-events-auto' : 'opacity-0 -translate-x-10 z-0 pointer-events-none'}`}>
            {/* Login */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="mb-2 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className={`w-full mb-3 bg-white border border-[#ede9fe] p-3 rounded-lg flex items-center justify-center hover:border-[#c4b5fd] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <GoogleIcon />
                <span className="ml-3 text-[#7c3aed] font-medium">Continuar con Google</span>
              </button>
              <div className="flex items-center my-2">
                <div className="flex-1 h-px bg-[#ede9fe]" />
                <span className="mx-3 text-[#a78bfa] text-xs">O</span>
                <div className="flex-1 h-px bg-[#ede9fe]" />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#a78bfa]" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-[#ede9fe] rounded-lg focus:ring-2 focus:ring-[#a78bfa] focus:border-[#a78bfa] outline-none transition-colors duration-200 bg-white/80"
                  placeholder="Correo electrónico"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#a78bfa]" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-[#ede9fe] rounded-lg focus:ring-2 focus:ring-[#a78bfa] focus:border-[#a78bfa] outline-none transition-colors duration-200 bg-white/80"
                  placeholder="Contraseña"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full ${pastelAccent} text-white py-3 rounded-lg hover:${pastelAccentHover} transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                ) : (
                  <>
                    <span>Iniciar Sesión</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
          {/* Registro */}
          <div className={`absolute inset-0 transition-all duration-500 ${!isLogin ? 'opacity-100 translate-x-0 z-10 pointer-events-auto' : 'opacity-0 translate-x-10 z-0 pointer-events-none'}`}>
            {/* Registro */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="mb-2 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className={`w-full mb-3 bg-white border border-[#ede9fe] p-3 rounded-lg flex items-center justify-center hover:border-[#c4b5fd] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <GoogleIcon />
                <span className="ml-3 text-[#7c3aed] font-medium">Continuar con Google</span>
              </button>
              <div className="flex items-center my-2">
                <div className="flex-1 h-px bg-[#ede9fe]" />
                <span className="mx-3 text-[#a78bfa] text-xs">O</span>
                <div className="flex-1 h-px bg-[#ede9fe]" />
              </div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#a78bfa]" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-[#ede9fe] rounded-lg focus:ring-2 focus:ring-[#a78bfa] focus:border-[#a78bfa] outline-none transition-colors duration-200 bg-white/80"
                  placeholder="Nombre completo"
                  required
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#a78bfa]" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-[#ede9fe] rounded-lg focus:ring-2 focus:ring-[#a78bfa] focus:border-[#a78bfa] outline-none transition-colors duration-200 bg-white/80"
                  placeholder="Correo electrónico"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#a78bfa]" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-[#ede9fe] rounded-lg focus:ring-2 focus:ring-[#a78bfa] focus:border-[#a78bfa] outline-none transition-colors duration-200 bg-white/80"
                  placeholder="Contraseña"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#a78bfa]" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-[#ede9fe] rounded-lg focus:ring-2 focus:ring-[#a78bfa] focus:border-[#a78bfa] outline-none transition-colors duration-200 bg-white/80"
                  placeholder="Confirmar contraseña"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full ${pastelAccent} text-white py-3 rounded-lg hover:${pastelAccentHover} transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                ) : (
                  <>
                    <span>Registrarse</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Toggle Form Type */}
        <div className="mt-10 text-center z-20 relative">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setFormData({
                name: '',
                email: '',
                password: '',
                confirmPassword: ''
              });
            }}
            className="text-[#a78bfa] hover:text-[#7c3aed] text-sm transition-colors duration-200 font-medium"
          >
            {isLogin
              ? '¿No tienes una cuenta? Regístrate'
              : '¿Ya tienes una cuenta? Inicia sesión'}
          </button>
        </div>
      </div>

      {/* Animaciones Tailwind personalizadas */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-20px);}
          to { opacity: 1; transform: translateY(0);}
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px);}
          to { opacity: 1; transform: translateY(0);}
        }
        .animate-fade-in { animation: fade-in 0.7s both; }
        .animate-fade-in-down { animation: fade-in-down 0.7s both; }
        .animate-fade-in-up { animation: fade-in-up 0.7s both; }
      `}</style>
    </div>
  );
};

export default AuthForm;
