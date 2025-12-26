import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { auth } from '../firebase';
import { signInAnonymously } from 'firebase/auth';

export default function LoginScreen() {
    const handleLogin = async () => {
        try {
            await signInAnonymously(auth);
            // 성공 시 자동으로 Calendar 화면으로 이동
        } catch (error) {
            console.error('로그인 실패:', error);
            Alert.alert('로그인 실패', '다시 시도해주세요.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.loginBox}>
                <Text style={styles.emoji}>💰</Text>
                <Text style={styles.title}>가계부</Text>
                <Text style={styles.subtitle}>간편하게 시작하세요</Text>

                <TouchableOpacity
                    style={styles.loginBtn}
                    onPress={handleLogin}
                >
                    <Text style={styles.loginBtnText}>🚀 시작하기</Text>
                </TouchableOpacity>

                <Text style={styles.note}>
                    * 즉시 사용 가능한 익명 로그인{'\n'}
                    개인정보 수집 없이 안전하게 시작
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#667eea',
    },
    loginBox: {
        backgroundColor: 'white',
        padding: 40,
        borderRadius: 20,
        alignItems: 'center',
        width: '85%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    emoji: {
        fontSize: 60,
        marginBottom: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 30,
    },
    loginBtn: {
        backgroundColor: '#667eea',
        borderWidth: 0,
        padding: 15,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
    },
    loginBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    note: {
        marginTop: 20,
        fontSize: 11,
        color: '#999',
        textAlign: 'center',
        lineHeight: 16,
    },
});