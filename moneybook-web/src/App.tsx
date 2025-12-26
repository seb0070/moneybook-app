import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import Login from './components/Login';
import Calendar from './components/Calendar';
import './App.css';

function App() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className="loading">로딩중...</div>;
    }

    if (!user) {
        return <Login />;
    }

    return (
        <div className="App">
            <header className="header">
                <div className="header-content">
                    <h1>💰 가계부</h1>
                    <div className="user-info">
                        <span>{user.displayName}</span>
                        <button onClick={() => auth.signOut()} className="logout-btn">
                            로그아웃
                        </button>
                    </div>
                </div>
            </header>

            <div className="main-wrapper">
                <div className="container">
                    <Calendar userId={user.uid} />
                </div>
            </div>
        </div>
    );
}

export default App;