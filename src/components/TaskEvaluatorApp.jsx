import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Upload, Download, Settings, LogOut, Users, BookOpen, Star, MessageSquare, Trash2, Eye, Plus, Edit, Save, X, FileCheck, User } from 'lucide-react';
import { auth, db } from '../firebase';
import { signOut } from "firebase/auth";
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { collection, onSnapshot, addDoc, setDoc, deleteDoc } from "firebase/firestore";
import { callGeminiWithFiles, callGeminiAPI as CallGeminiAPI } from '../gemini';
import AuthForm from './AuthForm';
import Profile from './Profile';

const TaskEvaluatorApp = () => {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingBase, setIsUploadingBase] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [newSubject, setNewSubject] = useState({
    name: '',
    criteria: [''],
    scoreType: '1-10'
  });
  const fileInputRef = useRef(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [feedbackModal, setFeedbackModal] = useState({ open: false, task: null });
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false); // Nuevo estado para el modal de perfil
  const profileMenuRef = useRef(null);

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        // Cargar datos adicionales desde Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        // Combinar datos de Firebase Auth con Firestore
        const userData = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
          role: 'teacher', // valor por defecto
          createdAt: firebaseUser.metadata.creationTime,
          // Agregar datos adicionales desde Firestore si existen
          ...(userDoc.exists() ? userDoc.data() : {})
        };
        
        setUser(userData);
        
        // Guardar en localStorage como respaldo
        localStorage.setItem(`user_${firebaseUser.uid}`, JSON.stringify(userData));
        localStorage.setItem('last_logged_in_user_id', firebaseUser.uid);
        
        // Aplicar tema guardado
        const savedTheme = userData.settings?.theme || localStorage.getItem(`theme_${firebaseUser.uid}`) || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
      } catch (error) {
        console.error('Error cargando datos del usuario:', error);
        
        // Fallback a localStorage si hay error con Firestore
        const lastLoggedInUserId = localStorage.getItem('last_logged_in_user_id');
        if (lastLoggedInUserId) {
          const savedUser = localStorage.getItem(`user_${lastLoggedInUserId}`);
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        }
      }
    } else {
      // Usuario no autenticado
      setUser(null);
    }
  });

  return () => unsubscribe();
}, []);

  // Sincronizar asignaturas desde Firestore
  useEffect(() => {
    if (!user) return;
    const subjectsCol = collection(db, 'users', user.id, 'subjects');
    const unsubscribe = onSnapshot(subjectsCol, (snapshot) => {
      const subjectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubjects(subjectsData);
    });
    return () => unsubscribe();
  }, [user]);

  // Sincronizar tareas desde Firestore
  useEffect(() => {
    if (!user) return;
    const tasksCol = collection(db, 'users', user.id, 'tasks');
    const unsubscribe = onSnapshot(tasksCol, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksData);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
  try {
    const userId = user?.id;
    await signOut(auth);
    
    // Limpiar datos locales
    if (userId) {
      localStorage.removeItem(`user_${userId}`);
    }
    localStorage.removeItem('last_logged_in_user_id');
    
    setUser(null);
    setCurrentView('dashboard');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
};

  // Manejar carga de archivo base (almacenado localmente en el navegador)
  const handleBaseFileUpload = async (e, subjectId) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Solo se permiten archivos PDF para el archivo base');
      return;
    }

    setIsUploadingBase(true);
    
    try {
      // Guardar información del archivo base en Firestore
      const subjectDoc = doc(db, 'users', user.id, 'subjects', subjectId);
      await setDoc(subjectDoc, { 
        baseFileName: file.name,
        baseFileSize: file.size,
        baseFileLastModified: file.lastModified
      }, { merge: true });
      
      // Actualizar el estado local del subject con el archivo
      setSubjects(prev => prev.map(subject => 
        subject.id === subjectId 
          ? { 
              ...subject, 
              baseFileName: file.name, 
              baseFileSize: file.size,
              baseFileLastModified: file.lastModified,
              baseFile: file // Mantener referencia al archivo
            }
          : subject
      ));
      
      alert(`Archivo base "${file.name}" cargado correctamente para la asignatura`);
    } catch (error) {
      console.error('Error guardando información del archivo base:', error);
      alert('Error al guardar la información del archivo base');
    } finally {
      setIsUploadingBase(false);
      e.target.value = '';
    }
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    const subjectsCol = collection(db, 'users', user.id, 'subjects');
    const subjectData = {
      ...newSubject,
      criteria: newSubject.criteria.filter(c => c.trim()),
    };

    if (editingSubject) {
      delete subjectData.id;
      delete subjectData.baseFile;
      delete subjectData.baseFileName;
      delete subjectData.baseFileSize;
      delete subjectData.baseFileLastModified;
      const subjectDoc = doc(db, 'users', user.id, 'subjects', editingSubject.id);
      await setDoc(subjectDoc, subjectData, { merge: true });
      setEditingSubject(null);
    } else {
      subjectData.baseFileName = null;
      subjectData.baseFileSize = null;
      subjectData.baseFileLastModified = null;
      await addDoc(subjectsCol, subjectData);
    }
    
    setNewSubject({ name: '', criteria: [''], scoreType: '1-10' });
    setShowSubjectForm(false);
  };

  const addCriterion = () => {
    setNewSubject(prev => ({
      ...prev,
      criteria: [...prev.criteria, '']
    }));
  };

  const updateCriterion = (index, value) => {
    setNewSubject(prev => ({
      ...prev,
      criteria: prev.criteria.map((c, i) => i === index ? value : c)
    }));
  };

  const removeCriterion = (index) => {
    setNewSubject(prev => ({
      ...prev,
      criteria: prev.criteria.filter((_, i) => i !== index)
    }));
  };

  const deleteTask = async (taskId) => {
    if (confirm('¿Estás seguro de eliminar esta evaluación?')) {
      const taskDoc = doc(db, 'users', user.id, 'tasks', taskId);
      await deleteDoc(taskDoc);
    }
  };

  const removeBaseFile = async (subjectId) => {
    if (confirm('¿Estás seguro de eliminar el archivo base? Esto afectará futuras evaluaciones.')) {
      const subjectDoc = doc(db, 'users', user.id, 'subjects', subjectId);
      await setDoc(subjectDoc, { 
        baseFileName: null, 
        baseFileSize: null,
        baseFileLastModified: null
      }, { merge: true });
      
      // Actualizar estado local
      setSubjects(prev => prev.map(subject => 
        subject.id === subjectId 
          ? { 
              ...subject, 
              baseFileName: null, 
              baseFileSize: null,
              baseFileLastModified: null,
              baseFile: null
            }
          : subject
      ));
    }
  };

  const exportGrades = () => {
    const csvContent = [
      ['Estudiante', 'Asignatura', 'Calificación', 'Calificación Máxima', 'Fecha', 'Evaluado por', 'Archivo Base'],
      ...tasks.map(task => [
        task.studentName,
        task.subject,
        task.score,
        task.maxScore,
        task.uploadDate,
        task.evaluatedBy,
        task.baseFileUsed || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calificaciones.csv';
    a.click();
  };

  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
    setPendingFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const handleBatchUpload = async () => {
    if (!selectedSubject || !pendingFiles.length) {
      alert('Selecciona una asignatura y agrega archivos PDF');
      return;
    }

    const subject = subjects.find(s => s.id === selectedSubject);
    if (!subject.baseFile && !subject.baseFileName) {
      alert('Esta asignatura necesita un archivo base antes de poder evaluar trabajos');
      return;
    }

    setIsUploading(true);
    
    try {
      // Si no tenemos el archivo base en memoria, pedimos al usuario que lo vuelva a cargar
      let baseFile = subject.baseFile;
      if (!baseFile) {
        alert(`Necesitas volver a cargar el archivo base "${subject.baseFileName}" para esta asignatura.`);
        setIsUploading(false);
        return;
      }

      const evaluationPromises = pendingFiles.map(file => 
        callGeminiWithFiles(baseFile, file, subject)
          .then(evaluation => {
            const score = parseFloat(evaluation.score);
            return {
              fileName: file.name,
              studentName: file.name.replace('.pdf', '').replace(/[-_]/g, ' '),
              subject: subject.name,
              subjectId: selectedSubject,
              score: isNaN(score) ? 0 : score,
              maxScore: subject.scoreType === '1-10' ? 10 : subject.scoreType === '1-5' ? 5 : 100,
              feedback: evaluation.feedback,
              uploadDate: new Date().toLocaleDateString(),
              evaluatedBy: user.name,
              baseFileUsed: subject.baseFileName
            };
          })
          .catch(error => {
            console.error(`Error evaluando ${file.name}: ${error.message}`);
            alert(`No se pudo evaluar el archivo: ${file.name}. Error: ${error.message}.`);
            return null;
          })
      );

      const results = await Promise.all(evaluationPromises);
      const successfulTasks = results.filter(task => task !== null);

      // Guardar las tareas exitosas en Firestore
      const tasksCol = collection(db, 'users', user.id, 'tasks');
      await Promise.all(successfulTasks.map(task => addDoc(tasksCol, task)));

      if (successfulTasks.length > 0) {
        alert(`Se evaluaron exitosamente ${successfulTasks.length} archivos de ${pendingFiles.length}.`);
      }

    } catch (error) {
      console.error("Error en el proceso de calificación por lotes:", error);
      alert(`Ocurrió un error general durante la calificación: ${error.message}`);
    } finally {
      setIsUploading(false);
      setPendingFiles([]);
    }
  };

  // Función para recargar archivo base
  const reloadBaseFile = async (subjectId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        setSubjects(prev => prev.map(subject => 
          subject.id === subjectId 
            ? { ...subject, baseFile: file }
            : subject
        ));
        alert('Archivo base recargado en memoria');
      }
    };
    input.click();
  };

 if (!user) {
    return <AuthForm setUser={setUser} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-600 rounded-lg p-2">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-indigo-600">Sistema de Evaluación</h1>
                <p className="text-sm text-gray-600">Con Gemini AI</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div 
                className="relative"
                ref={profileMenuRef}
              >
                <div 
                  className="flex items-center space-x-2 cursor-pointer"
                  onClick={() => setIsProfileMenuOpen(prev => !prev)}
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Foto de perfil"
                      className="w-8 h-8 rounded-full object-cover border-2 border-indigo-300"
                    />
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-400 text-xl">
                      👤
                    </span>
                  )}
                  <span className="text-sm text-gray-700">
                    {user.name} ({user.role})
                  </span>
                </div>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <button
                      onClick={() => {
                        setShowProfileModal(true);
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <User className="w-4 h-4 text-gray-500" />
                      <span>Configurar perfil</span>
                    </button>
                    <button
                      onClick={() => {
                        setCurrentView('settings');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-gray-500" />
                      <span>Configuración</span>
                    </button>
                    <div className="border-t border-gray-100"></div>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-gray-500" />
                      <span>Salir</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Modal de Perfil */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <Profile 
                user={user} 
                setUser={setUser} 
                onClose={() => setShowProfileModal(false)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Navegación */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-1 mb-8 bg-white rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`px-4 py-2 rounded-md transition-colors ${
              currentView === 'dashboard' 
                ? 'bg-indigo-600 text-white' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentView('subjects')}
            className={`px-4 py-2 rounded-md transition-colors ${
              currentView === 'subjects' 
                ? 'bg-indigo-600 text-white' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Asignaturas
          </button>
          <button
            onClick={() => setCurrentView('upload')}
            className={`px-4 py-2 rounded-md transition-colors ${
              currentView === 'upload' 
                ? 'bg-indigo-600 text-white' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Subir Tareas
          </button>
          <button
            onClick={() => setCurrentView('evaluations')}
            className={`px-4 py-2 rounded-md transition-colors ${
              currentView === 'evaluations' 
                ? 'bg-indigo-600 text-white' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Evaluaciones
          </button>
        </div>

        {/* Dashboard */}
        {currentView === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Evaluaciones</p>
                    <p className="text-3xl font-bold text-indigo-600">{tasks.length}</p>
                  </div>
                  <div className="bg-indigo-100 rounded-full p-3">
                    <FileText className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Promedio General</p>
                    <p className="text-3xl font-bold text-green-600">
                      {tasks.length ? (tasks.reduce((sum, task) => sum + (task.score / task.maxScore * 10), 0) / tasks.length).toFixed(1) : '0.0'}
                    </p>
                  </div>
                  <div className="bg-green-100 rounded-full p-3">
                    <Star className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Asignaturas Configuradas</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {subjects.filter(s => s.baseFileName).length}/{subjects.length}
                    </p>
                  </div>
                  <div className="bg-purple-100 rounded-full p-3">
                    <BookOpen className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Métricas por materia */}
            <div className="bg-white rounded-xl shadow-sm p-6 mt-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Desempeño por materia</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {subjects.map(subject => {
                  const subjectTasks = tasks.filter(t => t.subjectId === subject.id);
                  const avg = subjectTasks.length
                    ? (subjectTasks.reduce((sum, t) => sum + (t.score / t.maxScore * 10), 0) / subjectTasks.length).toFixed(1)
                    : '0.0';
                  return (
                    <div key={subject.id} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-indigo-700">{subject.name}</h4>
                      <p className="text-sm text-gray-600">Tareas evaluadas: <span className="font-bold">{subjectTasks.length}</span></p>
                      <p className="text-sm text-gray-600">Promedio: <span className="font-bold">{avg}</span></p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Upload View */}
        {currentView === 'upload' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Subir Tareas para Evaluación</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Seleccionar Asignatura
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecciona una asignatura</option>
                  {subjects.filter(s => s.baseFileName).map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} (Base: {subject.baseFileName})
                    </option>
                  ))}
                </select>
                
                {selectedSubject && !subjects.find(s => s.id === selectedSubject)?.baseFileName && (
                  <p className="text-red-600 text-sm mt-2">
                    Esta asignatura necesita un archivo base antes de poder evaluar trabajos
                  </p>
                )}
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileSelection}
                  className="hidden"
                />
                <button
                  onClick={() => {
                    if (!selectedSubject) {
                      alert('Selecciona una asignatura primero');
                      return;
                    }
                    const subject = subjects.find(s => s.id === selectedSubject);
                    if (!subject?.baseFileName) {
                      alert('Esta asignatura necesita un archivo base primero');
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  disabled={!selectedSubject || isUploading}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Agregar Archivos
                </button>
                
                {pendingFiles.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-700 mb-2">Archivos seleccionados:</h4>
                    <ul className="text-sm text-gray-600 mb-4">
                      {pendingFiles.map((f, i) => <li key={i}>{f.name}</li>)}
                    </ul>
                    
                    {selectedSubject && !subjects.find(s => s.id === selectedSubject)?.baseFile && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 text-sm mb-2">
                          Necesitas recargar el archivo base en memoria para continuar:
                        </p>
                        <button
                          onClick={() => reloadBaseFile(selectedSubject)}
                          className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                        >
                          Recargar Archivo Base
                        </button>
                      </div>
                    )}
                    
                    <button
                      onClick={handleBatchUpload}
                      disabled={isUploading || (selectedSubject && !subjects.find(s => s.id === selectedSubject)?.baseFile)}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isUploading ? 'Calificando...' : 'Enviar y calificar todos'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Evaluations View */}
        {currentView === 'evaluations' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Evaluaciones Realizadas</h2>
              <button
                onClick={exportGrades}
                className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Estudiante</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Asignatura</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Calificación</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Archivo Base</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Fecha</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 text-gray-400 mr-2" />
                          {task.studentName}
                        </div>
                      </td>
                      <td className="py-4 px-4">{task.subject}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.score / task.maxScore >= 0.7 
                            ? 'bg-green-100 text-green-800' 
                            : task.score / task.maxScore >= 0.5 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {Number(task.score).toFixed(1)}/{task.maxScore}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <FileCheck className="w-4 h-4 mr-1" />
                          {task.baseFileUsed || 'N/A'}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">{task.uploadDate}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setFeedbackModal({ open: true, task })}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver explicación detallada"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar evaluación"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {tasks.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No hay evaluaciones realizadas</p>
                  <p className="text-sm text-gray-500">Configura archivos base y sube trabajos para comenzar</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subjects View */}
        {currentView === 'subjects' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Gestión de Asignaturas</h2>
              <button
                onClick={() => {
                  setShowSubjectForm(true);
                  setEditingSubject(null);
                  setNewSubject({ name: '', criteria: [''], scoreType: '1-10' });
                }}
                className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Asignatura</span>
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map(subject => (
                <div key={subject.id} className="border border-gray-200 rounded-lg p-4 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                      <p className="text-sm text-gray-600">Escala: {subject.scoreType}</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingSubject(subject);
                        setNewSubject(subject);
                        setShowSubjectForm(true);
                      }}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Editar detalles de la asignatura"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Criterios de evaluación:</p>
                    <div className="flex flex-wrap gap-2">
                      {subject.criteria.map((criterion, index) => (
                        <span key={index} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                          {criterion}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-2">Archivo Base de Referencia</p>
                    <div className="flex items-center space-x-2">
                      {subject.baseFileName ? (
                        <>
                          <div className="flex-1 flex items-center text-green-700 text-sm bg-green-50 p-2 rounded-md">
                            <FileCheck className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate" title={subject.baseFileName}>{subject.baseFileName}</span>
                          </div>
                          <button
                            onClick={() => removeBaseFile(subject.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Eliminar archivo base"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => handleBaseFileUpload(e, subject.id)}
                            id={`base-file-input-${subject.id}`}
                            className="hidden"
                            disabled={isUploadingBase}
                          />
                          <label
                            htmlFor={`base-file-input-${subject.id}`}
                            className={`cursor-pointer w-full text-center px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center space-x-2 ${isUploadingBase ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                          >
                            <Upload className="w-4 h-4" />
                            <span>{isUploadingBase ? 'Cargando...' : 'Subir Archivo Base'}</span>
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Subject Form Modal */}
            {showSubjectForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editingSubject ? 'Editar Asignatura' : 'Nueva Asignatura'}
                    </h3>
                    <button
                      onClick={() => setShowSubjectForm(false)}
                      className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSubjectSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre de la Asignatura
                      </label>
                      <input
                        type="text"
                        value={newSubject.name}
                        onChange={(e) => setNewSubject(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Puntuación
                      </label>
                      <select
                        value={newSubject.scoreType}
                        onChange={(e) => setNewSubject(prev => ({ ...prev, scoreType: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="1-10">1 a 10</option>
                        <option value="1-5">1 a 5</option>
                        <option value="1-100">1 a 100</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Criterios de Evaluación
                      </label>
                      <div className="space-y-2">
                        {newSubject.criteria.map((criterion, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={criterion}
                              onChange={(e) => updateCriterion(index, e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Criterio de evaluación"
                            />
                            {newSubject.criteria.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeCriterion(index)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addCriterion}
                          className="text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors text-sm"
                        >
                          + Agregar criterio
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex space-x-3 pt-6">
                      <button
                        type="button"
                        onClick={() => setShowSubjectForm(false)}
                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        {editingSubject ? 'Actualizar' : 'Crear'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

       {/* Modal de retroalimentación */}
        {feedbackModal.open && feedbackModal.task && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-0 max-w-lg w-full relative flex flex-col h-[80vh]">
              <button
                onClick={() => setFeedbackModal({ open: false, task: null })}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
                aria-label="Cerrar"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="px-8 pt-8 pb-2">
                <h3 className="text-xl font-bold text-indigo-700 mb-2">
                  Retroalimentación para {feedbackModal.task.studentName}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-semibold">Calificación:</span> {feedbackModal.task.score}/{feedbackModal.task.maxScore}
                </p>
              </div>
              <div
                className="flex-1 overflow-y-auto px-8 pb-8 bg-indigo-50 rounded-b-xl text-gray-800"
                style={{ minHeight: 0 }}
              >
                <ReactMarkdown>{feedbackModal.task.feedback}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskEvaluatorApp;
