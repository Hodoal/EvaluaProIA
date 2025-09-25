import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import LandingPage from './components/LandingPage';
import TaskEvaluatorApp from './components/TaskEvaluatorApp';

const MainApp = () => {
  const [user, setUser] = useState(null);
  const [showApp, setShowApp] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setShowApp(true); 
      } else {
        setUser(null);
        setShowApp(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStartApp = () => {
    setShowApp(true);
  };

  const handleBackToLanding = () => {
    setShowApp(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-indigo-600 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!showApp ? (
        <LandingPage onStartApp={handleStartApp} />
      ) : (
        <TaskEvaluatorApp onBackToLanding={handleBackToLanding} />
      )}
    </>
  );
};

export default MainApp;