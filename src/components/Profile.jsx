import React, { useState, useEffect, } from 'react';
import { 
  User, Mail, Camera, Save, X, Eye, EyeOff, Shield, Bell, 
  Globe, Moon, Sun, Trash2, Download, Settings, Lock,
  AlertTriangle, CheckCircle
} from 'lucide-react';
import { auth, storage, db } from '../firebase';
import { updateProfile, updatePassword, updateEmail, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, deleteDoc, collection, getDocs, getDoc, setDoc } from 'firebase/firestore';

const Profile = ({ user, setUser, onClose }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Estados para configuraciones
  const [settings, setSettings] = useState({
    theme: 'light',
    language: 'es',
    notifications: {
      email: true,
      taskCompleted: true,
      gradeReady: true
    },
    privacy: {
      profileVisible: true,
      showEmail: false
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  // Cargar datos desde Firebase al inicializar
  useEffect(() => {
    loadUserDataFromFirebase();
  }, [user.id]);

  const loadUserDataFromFirebase = async () => {
    if (!user.id) return;

    try {
      // Cargar datos del perfil desde Firebase Auth
      const currentUser = auth.currentUser;
      if (currentUser) {
        setFormData({
          name: currentUser.displayName || '',
          email: currentUser.email || '',
          newPassword: '',
          confirmPassword: ''
        });

        // Actualizar el usuario con datos de Firebase Auth
        const updatedUser = {
          ...user,
          name: currentUser.displayName || user.name,
          email: currentUser.email || user.email,
          photoURL: currentUser.photoURL || user.photoURL
        };
        
        if (JSON.stringify(updatedUser) !== JSON.stringify(user)) {
          setUser(updatedUser);
        }
      }

      // Cargar configuraciones desde Firestore
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists() && userDoc.data().settings) {
        const firebaseSettings = userDoc.data().settings;
        setSettings(firebaseSettings);
        
        // Aplicar tema inmediatamente
        document.documentElement.setAttribute('data-theme', firebaseSettings.theme);
      } else {
        // Si no existen configuraciones en Firestore, crear documento inicial
        await setDoc(userDocRef, {
          settings: settings,
          updatedAt: new Date(),
          email: user.email,
          name: user.name
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error cargando datos desde Firebase:', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
    setSuccess('');
  };

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen debe ser menor a 2MB');
      return;
    }

    setUploadingPhoto(true);
    setError('');

    try {
      const photoRef = ref(storage, `profile-photos/${user.id}/${Date.now()}-${file.name}`);
      await uploadBytes(photoRef, file);
      const downloadURL = await getDownloadURL(photoRef);

      // Actualizar en Firebase Auth
      await updateProfile(auth.currentUser, {
        photoURL: downloadURL
      });

      // Actualizar en Firestore
      const userDocRef = doc(db, 'users', user.id);
      await updateDoc(userDocRef, {
        photoURL: downloadURL,
        updatedAt: new Date()
      });

      // Actualizar estado local
      const updatedUser = { ...user, photoURL: downloadURL };
      setUser(updatedUser);
      
      setSuccess('Foto de perfil actualizada correctamente');
    } catch (error) {
      console.error('Error subiendo foto:', error);
      setError('Error al subir la foto: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const currentUser = auth.currentUser;
      let updated = false;

      // Actualizar nombre en Firebase Auth
      if (formData.name !== user.name) {
        await updateProfile(currentUser, {
          displayName: formData.name
        });
        updated = true;
      }

      // Actualizar email en Firebase Auth
      if (formData.email !== user.email) {
        await updateEmail(currentUser, formData.email);
        updated = true;
      }

      // Actualizar contraseña en Firebase Auth
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('Las contraseñas no coinciden');
        }
        if (formData.newPassword.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        await updatePassword(currentUser, formData.newPassword);
        updated = true;
      }

      if (updated) {
        // Actualizar en Firestore
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, {
          name: formData.name,
          email: formData.email,
          updatedAt: new Date()
        });

        // Actualizar estado local
        const updatedUser = {
          ...user,
          name: formData.name,
          email: formData.email
        };
        setUser(updatedUser);
        
        setSuccess('Perfil actualizado correctamente');
        
        setFormData(prev => ({
          ...prev,
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        setSuccess('No hay cambios que guardar');
      }

    } catch (error) {
      console.error('Error actualizando perfil:', error);
      let errorMessage = error.message;
      
      if (errorMessage.includes('email-already-in-use')) {
        errorMessage = 'Este correo ya está en uso por otra cuenta';
      } else if (errorMessage.includes('weak-password')) {
        errorMessage = 'La contraseña es demasiado débil';
      } else if (errorMessage.includes('requires-recent-login')) {
        errorMessage = 'Para cambiar el email o contraseña, necesitas volver a iniciar sesión';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Guardar configuraciones en Firestore (principal)
      if (user.id) {
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, {
          settings: settings,
          updatedAt: new Date()
        });
      }

      // También guardar en localStorage como respaldo
      localStorage.setItem(`theme_${user.id}`, settings.theme);
      localStorage.setItem(`language_${user.id}`, settings.language);
      localStorage.setItem(`emailNotifications_${user.id}`, JSON.stringify(settings.notifications.email));
      localStorage.setItem(`taskNotifications_${user.id}`, JSON.stringify(settings.notifications.taskCompleted));
      localStorage.setItem(`gradeNotifications_${user.id}`, JSON.stringify(settings.notifications.gradeReady));
      localStorage.setItem(`profileVisible_${user.id}`, JSON.stringify(settings.privacy.profileVisible));
      localStorage.setItem(`showEmail_${user.id}`, JSON.stringify(settings.privacy.showEmail));

      // Aplicar tema inmediatamente
      document.documentElement.setAttribute('data-theme', settings.theme);
      
      setSuccess('Configuraciones guardadas correctamente');
    } catch (error) {
      console.error('Error guardando configuraciones:', error);
      setError('Error al guardar las configuraciones');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      setLoading(true);
      
      let userData = {
        profile: {
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          photoURL: user.photoURL
        },
        settings: settings,
        exportDate: new Date().toISOString()
      };

      // Intentar obtener datos adicionales de Firestore si existe el ID del usuario
      if (user.id) {
        try {
          // Obtener tareas
          const tasksSnapshot = await getDocs(collection(db, 'users', user.id, 'tasks'));
          userData.tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // Obtener asignaturas
          const subjectsSnapshot = await getDocs(collection(db, 'users', user.id, 'subjects'));
          userData.subjects = subjectsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            baseFile: null // No exportar archivos binarios
          }));
        } catch (firestoreError) {
          console.warn('No se pudieron obtener todos los datos de Firestore:', firestoreError);
          userData.note = 'Algunos datos no pudieron ser exportados desde la base de datos';
        }
      }

      // Crear y descargar archivo JSON
      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mis-datos-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccess('Datos exportados correctamente');
    } catch (error) {
      console.error('Error exportando datos:', error);
      setError('Error al exportar los datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (!deletePassword) {
      setError('Ingresa tu contraseña para confirmar');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      
      // Reautenticar usuario
      const credential = EmailAuthProvider.credential(currentUser.email, deletePassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Eliminar datos de Firestore
      if (user.id) {
        // Eliminar todas las tareas
        const tasksSnapshot = await getDocs(collection(db, 'users', user.id, 'tasks'));
        await Promise.all(tasksSnapshot.docs.map(doc => deleteDoc(doc.ref)));
        
        // Eliminar todas las asignaturas
        const subjectsSnapshot = await getDocs(collection(db, 'users', user.id, 'subjects'));
        await Promise.all(subjectsSnapshot.docs.map(doc => deleteDoc(doc.ref)));
        
        // Eliminar documento del usuario
        await deleteDoc(doc(db, 'users', user.id));
      }

      // Eliminar cuenta de Firebase Auth
      await deleteUser(currentUser);
      
      // Limpiar localStorage
      const keysToRemove = [
        `user_${user.id}`,
        `theme_${user.id}`,
        `language_${user.id}`,
        `emailNotifications_${user.id}`,
        `taskNotifications_${user.id}`,
        `gradeNotifications_${user.id}`,
        `profileVisible_${user.id}`,
        `showEmail_${user.id}`
      ];
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Redirigir o cerrar
      setUser(null);
      onClose();
      
    } catch (error) {
      console.error('Error eliminando cuenta:', error);
      let errorMessage = error.message;
      if (errorMessage.includes('wrong-password')) {
        errorMessage = 'Contraseña incorrecta';
      } else if (errorMessage.includes('requires-recent-login')) {
        errorMessage = 'Necesitas volver a iniciar sesión antes de eliminar tu cuenta';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
      setDeletePassword('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Configuración de Cuenta</h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Pestañas */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'profile' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <User className="w-4 h-4 inline mr-2" />
          Perfil
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'settings' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Settings className="w-4 h-4 inline mr-2" />
          Preferencias
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'security' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Shield className="w-4 h-4 inline mr-2" />
          Seguridad
        </button>
      </div>

      {/* Mensajes de estado */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg text-green-600 text-sm">
          {success}
        </div>
      )}

      {/* Contenido de pestañas */}
      {activeTab === 'profile' && (
        <div>
          {/* Foto de perfil */}
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 mx-auto mb-4">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Foto de perfil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <User className="w-12 h-12" />
                  </div>
                )}
              </div>
              
              <label
                htmlFor="photo-upload"
                className={`absolute bottom-4 right-0 p-2 bg-indigo-600 text-white rounded-full cursor-pointer hover:bg-indigo-700 transition-colors ${uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploadingPhoto ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </label>
              
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                className="hidden"
              />
            </div>
            <p className="text-sm text-gray-600">Haz clic en la cámara para cambiar tu foto</p>
          </div>

          {/* Formulario de perfil */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors duration-200"
                  placeholder="Tu nombre completo"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors duration-200"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors duration-200"
                  placeholder="Dejar vacío para no cambiar"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {formData.newPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar nueva contraseña
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors duration-200"
                  placeholder="Confirma tu nueva contraseña"
                  required
                />
              </div>
            )}

            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <p className="font-medium mb-1">Información de cuenta:</p>
              <p>Rol: <span className="capitalize font-medium">{user.role}</span></p>
              <p>Registrado: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Información no disponible'}</p>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar cambios</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Tema */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tema de la aplicación
            </label>
            <div className="flex space-x-4">
              <button
                onClick={() => handleSettingChange('theme', '', 'light')}
                className={`flex items-center space-x-2 px-4 py-3 border rounded-lg transition-colors ${
                  settings.theme === 'light' 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Sun className="w-5 h-5" />
                <span>Claro</span>
              </button>
              <button
                onClick={() => handleSettingChange('theme', '', 'dark')}
                className={`flex items-center space-x-2 px-4 py-3 border rounded-lg transition-colors ${
                  settings.theme === 'dark' 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Moon className="w-5 h-5" />
                <span>Oscuro</span>
              </button>
            </div>
          </div>

          {/* Idioma */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Idioma
            </label>
            <select
              value={settings.language}
              onChange={(e) => handleSettingChange('language', '', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>

          {/* Notificaciones */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Bell className="w-4 h-4 mr-2" />
              Notificaciones
            </h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifications.email}
                  onChange={(e) => handleSettingChange('notifications', 'email', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Notificaciones por email</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifications.taskCompleted}
                  onChange={(e) => handleSettingChange('notifications', 'taskCompleted', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Tareas completadas</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifications.gradeReady}
                  onChange={(e) => handleSettingChange('notifications', 'gradeReady', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Calificaciones listas</span>
              </label>
            </div>
          </div>

          {/* Privacidad */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Lock className="w-4 h-4 mr-2" />
              Privacidad
            </h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.privacy.profileVisible}
                  onChange={(e) => handleSettingChange('privacy', 'profileVisible', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Perfil visible para otros usuarios</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.privacy.showEmail}
                  onChange={(e) => handleSettingChange('privacy', 'showEmail', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Mostrar email en perfil público</span>
              </label>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSaveSettings}
              disabled={loading}
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar configuración</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Exportar datos */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Exportar mis datos</h3>
                <p className="text-sm text-gray-600">Descarga una copia de toda tu información</p>
              </div>
              <button
                onClick={exportData}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Exportar</span>
              </button>
            </div>
          </div>

          {/* Zona peligrosa */}
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <div className="flex items-center mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <h3 className="text-sm font-medium text-red-900">Zona Peligrosa</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-red-700 mb-3">
                  Eliminar tu cuenta es una acción permanente. Se eliminarán todos tus datos, evaluaciones, asignaturas y configuraciones.
                </p>
                
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Eliminar mi cuenta
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-red-700 mb-2">
                        Confirma tu contraseña actual:
                      </label>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Tu contraseña actual"
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeletePassword('');
                        }}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={deleteAccount}
                        disabled={loading || !deletePassword}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            <span>Confirmar eliminación</span>
                          </>
                        )}
                      </button>
                    </div>
                    
                    <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
                      ⚠️ Esta acción no se puede deshacer. Todos tus datos se eliminarán permanentemente.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;