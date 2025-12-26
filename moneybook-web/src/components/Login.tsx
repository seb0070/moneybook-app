import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import './Login.css';

function Login() {
    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error('로그인 실패:', error);
            alert('로그인에 실패했습니다.');
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h1>💰 가계부</h1>
                <p>Google 계정으로 로그인하세요</p>
                <button onClick={handleGoogleLogin} className="google-btn">
                    <span>🔐 Google 로그인</span>
                </button>
            </div>
        </div>
    );
}

export default Login;