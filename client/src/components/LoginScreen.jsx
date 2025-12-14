import React, { useState } from 'react';

function LoginScreen({ onLogin, onRegister }) {
    const [isRegistering, setIsRegistering] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        displayName: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegistering) {
                // Validation
                if (formData.password !== formData.confirmPassword) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }

                if (formData.password.length < 8) {
                    setError('Password must be at least 8 characters');
                    setLoading(false);
                    return;
                }

                await onRegister(
                    formData.username,
                    formData.email,
                    formData.password,
                    formData.displayName
                );
            } else {
                await onLogin(formData.username, formData.password);
            }
        } catch (err) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-screen">
            <div className="login-background">
                <div className="snow-layer"></div>
            </div>

            <div className="login-container">
                <div className="login-header">
                    <h1 className="game-title">
                        <span className="reindeer-icon">🦌</span>
                        Reindeer Puzzle
                    </h1>
                    <p className="game-subtitle">Competitive Sliding Puzzle Challenge</p>
                </div>

                <div className="login-card">
                    <div className="login-tabs">
                        <button
                            className={`tab ${!isRegistering ? 'active' : ''}`}
                            onClick={() => {
                                setIsRegistering(false);
                                setError('');
                            }}
                        >
                            Login
                        </button>
                        <button
                            className={`tab ${isRegistering ? 'active' : ''}`}
                            onClick={() => {
                                setIsRegistering(true);
                                setError('');
                            }}
                        >
                            Register
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                minLength={3}
                                maxLength={20}
                                placeholder="Enter username"
                                autoComplete="username"
                            />
                        </div>

                        {isRegistering && (
                            <>
                                <div className="form-group">
                                    <label htmlFor="email">Email</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        placeholder="Enter email"
                                        autoComplete="email"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="displayName">Display Name (Optional)</label>
                                    <input
                                        type="text"
                                        id="displayName"
                                        name="displayName"
                                        value={formData.displayName}
                                        onChange={handleChange}
                                        maxLength={100}
                                        placeholder="Enter display name"
                                    />
                                </div>
                            </>
                        )}

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength={8}
                                placeholder="Enter password"
                                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                            />
                        </div>

                        {isRegistering && (
                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    minLength={8}
                                    placeholder="Confirm password"
                                    autoComplete="new-password"
                                />
                            </div>
                        )}

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary btn-large"
                            disabled={loading}
                        >
                            {loading ? 'Please wait...' : (isRegistering ? 'Create Account' : 'Login')}
                        </button>
                    </form>
                </div>

                <div className="login-footer">
                    <p>🎮 Master the puzzle | 🏆 Climb the leaderboards | 🦌 Unlock themes</p>
                </div>
            </div>
        </div>
    );
}

export default LoginScreen;
