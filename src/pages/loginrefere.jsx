import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, useAnimation } from 'framer-motion';
import { FaEye, FaEyeSlash, FaLock, FaUser} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import { Modal } from 'antd';
import { setSessionCookie, removeSessionCookie, refreshSessionCookie } from '../../utils/cookieUtils';
import { initializeSessionManager, updateLastActivity } from '../../utils/sessionManager';
import { SecureStorage } from '../../utils/encryption';
import ForcePassword from '../../components/forcePassword';
import { getApiBaseUrl } from '../../utils/apiConfig';

// Configure axios defaults for timeout and error handling
axios.defaults.timeout = 30000; // 30 seconds timeout

function Logins() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isCaptchaCorrect, setIsCaptchaCorrect] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const navigateTo = useNavigate();
    const controls = useAnimation();
    const [captchaText, setCaptchaText] = useState('');
    const [userCaptchaInput, setUserCaptchaInput] = useState('');
    const [captchaCanvasRef] = useState(React.createRef());
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);
    
    // Compute correct base path for public assets
    const assetBasePath = (() => {
        try {
          const apiBase = getApiBaseUrl();
          const url = new URL(apiBase);
          // For localhost development, we need to use the project path
          // For production deployment, we need to account for subdirectory paths
          if (url.hostname === 'localhost') {
            return '/gsd-reservation-main';
          }
          return url.pathname.replace(/\/backend\/.*$/, '');
        } catch (e) {
          return '';
        }
      })();

    // const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
    // // const [isSendingOtp, setIsSendingOtp] = useState(false);
    // const [canResendLoginOtp, setCanResendLoginOtp] = useState(false);

    const [otpDigits, setOtpDigits] = useState(Array(6).fill(''));
    const [otpRefs] = useState(Array(6).fill(0).map(() => React.createRef()));
    const [showCaptchaAfterEmail, setShowCaptchaAfterEmail] = useState(false);
    const [forgotPasswordCaptchaRef] = useState(React.createRef());
    // const [forgotPasswordCaptchaText, setForgotPasswordCaptchaText] = useState('');
    // const [forgotPasswordCaptchaInput, setForgotPasswordCaptchaInput] = useState('');
    // const [isForgotPasswordCaptchaCorrect, setIsForgotPasswordCaptchaCorrect] = useState(null);
    const [canResendOtp, setCanResendOtp] = useState(false);
    const [resendTimer, setResendTimer] = useState(180); // 3 minutes in seconds
    // const [isResending, setIsResending] = useState(false);
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordStrength, setPasswordStrength] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false
    });
    // Login 2FA OTP states
    const [showLoginOTP, setShowLoginOTP] = useState(false);
    const [loginOtpDigits, setLoginOtpDigits] = useState(Array(6).fill(''));
    const [loginOtpRefs] = useState(Array(6).fill(0).map(() => React.createRef()));
    const [isVerifyingLoginOtp, setIsVerifyingLoginOtp] = useState(false);
    const [loginResendTimer, setLoginResendTimer] = useState(180); // 3 minutes
    const [isResendingLoginOtp, setIsResendingLoginOtp] = useState(false);
    const [canResendLoginOtp, setCanResendLoginOtp] = useState(false);
    const [showForcePassword, setShowForcePassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [loginPassword, setLoginPassword] = useState(''); // Store password for OTP verification context
    
    // OTP storage with expiration (frontend-only, no server/database storage)
    const [storedOTP, setStoredOTP] = useState(null);
    const [otpExpiration, setOtpExpiration] = useState(null);
    
    // Login 2FA OTP storage (separate from forgot password OTP)
    const [storedLoginOTP, setStoredLoginOTP] = useState(null);
    const [loginOtpExpiration, setLoginOtpExpiration] = useState(null);
  


    const generateCaptcha = useCallback(() => {
        const canvas = captchaCanvasRef.current;
        if (!canvas) return; 

        const ctx = canvas.getContext('2d');
        if (!ctx) return; 
        
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let captcha = '';

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Set gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#f0fdf4');
        gradient.addColorStop(1, '#dcfce7');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Set fixed font properties
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Calculate character spacing
        const charWidth = canvas.width / 8;
        const startX = charWidth;
        const centerY = canvas.height / 2;

        // Generate and draw characters
        for (let i = 0; i < 6; i++) {
            const char = chars.charAt(Math.floor(Math.random() * chars.length));
            captcha += char;
            
            // Slightly randomize color for each character
            const hue = Math.floor(Math.random() * 360);
            ctx.fillStyle = `hsl(${hue}, 50%, 30%)`; // Using HSL for better contrast

            // Draw character at fixed position with slight vertical variation
            const x = startX + (i * charWidth);
            const y = centerY + (Math.random() * 6 - 3); // Small vertical variation (-3 to +3 pixels)
            ctx.fillText(char, x, y);
        }

        // Add subtle noise/lines in background (optional)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * canvas.width, 0);
            ctx.lineTo(Math.random() * canvas.width, canvas.height);
            ctx.stroke();
        }

        setCaptchaText(captcha);
        setUserCaptchaInput('');
        setIsCaptchaCorrect(null);
    }, [captchaCanvasRef]);

    const generateForgotPasswordCaptcha = useCallback(() => {
        const canvas = forgotPasswordCaptchaRef.current;
        if (!canvas) return; // Early return if canvas not mounted

        const ctx = canvas.getContext('2d');
        if (!ctx) return; // Early return if context not available
        
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        // let captcha = '';

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Set gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#f0fdf4');
        gradient.addColorStop(1, '#dcfce7');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Set font properties
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const charWidth = canvas.width / 8;
        const startX = charWidth;
        const centerY = canvas.height / 2;

        // Generate and draw characters
        for (let i = 0; i < 6; i++) {
            const char = chars.charAt(Math.floor(Math.random() * chars.length));
            // captcha += char;
            
            const hue = Math.floor(Math.random() * 360);
            ctx.fillStyle = `hsl(${hue}, 50%, 30%)`;

            const x = startX + (i * charWidth);
            const y = centerY + (Math.random() * 6 - 3);
            ctx.fillText(char, x, y);
        }

        // Add noise lines
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * canvas.width, 0);
            ctx.lineTo(Math.random() * canvas.width, canvas.height);
            ctx.stroke();
        }

        // setForgotPasswordCaptchaText(captcha);
        // setForgotPasswordCaptchaInput('');
        // setIsForgotPasswordCaptchaCorrect(null);
    }, [forgotPasswordCaptchaRef]);

    useEffect(() => {
        localStorage.removeItem('forcedLogout');
        localStorage.removeItem('logoutReason');
        const sessionNotification = document.querySelector('.session-info-notification');
        if (sessionNotification && document.body.contains(sessionNotification)) {
            document.body.removeChild(sessionNotification);
        }
        if (SecureStorage.getLocalItem('loggedIn') === 'true' || SecureStorage.getLocalItem('loggedIn') === 'true') {
            // Get user level from secure storage
            const userLevel = SecureStorage.getLocalItem('user_level') || SecureStorage.getLocalItem('user_level');
            
            // Navigate based on user level
            switch(userLevel) {
                case 'Super Admin':
                case 'Admin':
                    navigateTo('/Admin/Dashboard');
                    break;
                case 'Personnel':
                    navigateTo('/Personnel/Dashboard');
                    break;
                case 'Dean':
                case 'Principal':
                case 'Department Head':
                case 'Secretary':
                    navigateTo('/Department/Dashboard');
                    break;
                case 'Faculty/Staff':
                    navigateTo('/Faculty/Dashboard');
                    break;
                case 'Driver':
                    navigateTo('/Driver/Dashboard');
                    break;
                default:
                    // If no valid user level, clear everything except API URL
                    const savedApiUrl = SecureStorage.getLocalItem("url");
                    localStorage.clear();
                    sessionStorage.clear();
                    removeSessionCookie('userSession');
                    if (savedApiUrl) {
                        SecureStorage.setLocalItem("url", savedApiUrl);
                    }
            }
            return; // Exit early after navigation
        }

        // Continue with normal login page initialization
        const timer = setTimeout(() => {
            if (captchaCanvasRef.current) {
                generateCaptcha();
            }
        }, 100);

        const rememberedUsername = localStorage.getItem('rememberedUsername');
        if (rememberedUsername) {
            setUsername(rememberedUsername);
            setRememberMe(true);
        }

        controls.start({
            scale: [1, 1.1, 1],
            transition: { 
                duration: 2, 
                repeat: Infinity, 
                repeatType: "reverse" 
            }
        });

        return () => clearTimeout(timer);
    }, [controls, navigateTo, captchaCanvasRef, generateCaptcha]);

    useEffect(() => {
        if (showCaptchaAfterEmail) {
            // Delay captcha generation to ensure canvas is mounted
            const timer = setTimeout(() => {
                if (forgotPasswordCaptchaRef.current) {
                    generateForgotPasswordCaptcha();
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [showCaptchaAfterEmail, forgotPasswordCaptchaRef, generateForgotPasswordCaptcha]);

    // Countdown for forgot-password resend timer (3:00 -> 0)
    useEffect(() => {
        let intervalId;
        const handleVisibilityChange = () => {
            // No-op: keeping simple countdown even when tab hidden
        };

        if (showOtpInput && resendTimer > 0) {
            intervalId = setInterval(() => {
                setResendTimer((prev) => {
                    if (prev <= 1) {
                        setCanResendOtp(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [showOtpInput, resendTimer, setCanResendOtp]);

    // Login OTP timer effect
    useEffect(() => {
        let intervalId;
        
        if (showLoginOTP && loginResendTimer > 0) {
            intervalId = setInterval(() => {
                setLoginResendTimer((prev) => {
                    if (prev <= 1) {
                        setCanResendLoginOtp(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [showLoginOTP, loginResendTimer]);

    useEffect(() => {
        // Initialize session timeout handling with enhanced 1-minute inactivity detection
        const cleanup = initializeSessionManager(navigateTo);
        
        // Check for existing session on load
        const checkExistingSession = () => {
            const isLoggedIn = SecureStorage.getLocalItem('loggedIn') === 'true' || SecureStorage.getSessionItem('loggedIn');
            const userSession = document.cookie.includes('userSession=');
            
            // If we have localStorage but no valid session cookie, log out
            if (isLoggedIn && !userSession) {
                const savedApiUrl = localStorage.getItem("url");
                localStorage.clear();
                sessionStorage.clear();
                
                // Preserve API URL
                if (savedApiUrl) {
                    localStorage.setItem("url", savedApiUrl);
                }
                
                navigateTo('/');
            }
        };
        
        checkExistingSession();
        
        return () => cleanup();
    }, [navigateTo]);

    

    

    const handleCaptchaInput = (e) => {
        const input = e.target.value;
        setUserCaptchaInput(input);
        setIsCaptchaCorrect(input === captchaText);
    };

    // const handleForgotPasswordCaptchaInput = (e) => {
    //     const input = e.target.value;
    //     setForgotPasswordCaptchaInput(input);
    //     setIsForgotPasswordCaptchaCorrect(input === forgotPasswordCaptchaText);
    // };

    const notify = (message, type = 'success') => {
        toast[type](message, {
            duration: 4000, // Increased duration for blocked messages
            position: 'top-right',
            style: {
                borderRadius: '10px',
                background: type === 'error' ? '#FEE2E2' : '#ECFDF5',
                color: type === 'error' ? '#DC2626' : '#059669',
            },
            iconTheme: {
                primary: type === 'error' ? '#DC2626' : '#059669',
                secondary: 'white',
            },
        });
    };

    const validateSchoolId = (id) => {
        const schoolIdPattern = /^[^-]+-[^-]+-[^-]+$/;
        return schoolIdPattern.test(id);
    };

    const handleUsernameChange = (e) => {
        const input = e.target.value;
        setUsername(input);
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
    };

    // Helper function to handle API errors with detailed feedback
    const handleApiError = (error, context = 'Request') => {
        console.error(`${context} error:`, error);
        
        // Check if it's a timeout error
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            notify('Request timed out. Please check your internet connection and try again.', 'error');
            return;
        }
        
        // Check if it's a network error (no response from server)
        if (!error.response) {
            if (error.message === 'Network Error') {
                notify('Network error. Please check your internet connection.', 'error');
            } else {
                notify(`Connection error: ${error.message || 'Unable to reach server'}`, 'error');
            }
            return;
        }
        
        // Handle HTTP error responses
        const status = error.response?.status;
        const data = error.response?.data;
        
        switch (status) {
            case 400:
                notify(data?.message || 'Invalid request. Please check your input.', 'error');
                break;
            case 401:
                notify(data?.message || 'Invalid credentials. Please try again.', 'error');
                break;
            case 403:
                notify('Access forbidden. You do not have permission to access this resource.', 'error');
                break;
            case 404:
                notify('Service not found. Please contact support.', 'error');
                break;
            case 408:
                notify('Request timeout. Please try again.', 'error');
                break;
            case 429:
                notify(data?.message || 'Too many requests. Please try again later.', 'error');
                break;
            case 500:
                notify(data?.message || 'Server error. Please try again later.', 'error');
                break;
            case 502:
                notify('Bad gateway. The server is temporarily unavailable.', 'error');
                break;
            case 503:
                notify('Service unavailable. Please try again in a few moments.', 'error');
                break;
            case 504:
                notify('Gateway timeout. The server took too long to respond.', 'error');
                break;
            default:
                notify(data?.message || `Error: ${status}. Please try again.`, 'error');
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
    
        if (!username || !password || !isCaptchaCorrect) {
            notify("Please fill in all fields and complete the CAPTCHA correctly.", 'error');
            generateCaptcha(); // Refresh captcha on validation failure
            return;
        }
    
        if (!validateSchoolId(username)) {
            notify("Invalid school ID format.", 'error');
            generateCaptcha(); // Refresh captcha on validation failure
            return;
        }
    
        setLoading(true);
        
        // Always clear these flags on login attempt
        localStorage.removeItem('forcedLogout');
        localStorage.removeItem('logoutReason');
        
        // Remove any existing session notification elements
        const sessionNotification = document.querySelector('.session-info-notification');
        if (sessionNotification && document.body.contains(sessionNotification)) {
            document.body.removeChild(sessionNotification);
        }
    
        try {
            // Get and decrypt the stored URL
            const encryptedUrl = SecureStorage.getLocalItem("url");
            if (!encryptedUrl) {
                notify("API URL configuration is missing. Please contact support.", 'error');
                setLoading(false);
                return;
            }
            
            const apiUrl = encryptedUrl;
            console.log("Using API URL:", apiUrl);
            
            const loginResponse = await axios.post(`${apiUrl}login.php`, {
                operation: "login",
                json: { 
                    username: username, 
                    password: password 
                }
            }, {
                timeout: 30000, // 30 seconds timeout for this request
                headers: {
                    'Content-Type': 'application/json'
                }
            });
    
            console.log("Login response:", loginResponse.data);
            
            if (loginResponse.data.status === "success") {
                const userData = loginResponse.data.data;
                console.log("User data received:", userData);
                
                // Check if this is the first login and password needs to be changed
                if (userData.first_login === true) {
                    console.log("First login detected, forcing password change");
                    setCurrentPassword(password); // Store current password for comparison
                    // setLoginPassword(password); // Store password for OTP context
                    // Store user_id temporarily for password change process
                    SecureStorage.setSessionItem("temp_user_id", userData.user_id);
                    setShowForcePassword(true);
                    setLoading(false);
                    return;
                }
                
                // Clear any previous state
                removeSessionCookie('userSession');
                localStorage.removeItem('forcedLogout');
                localStorage.removeItem('logoutReason');
                
                // Set initial activity timestamp using the centralized function
                updateLastActivity();
                
                // Set encrypted session cookie with 1-minute expiry
                setSessionCookie('userSession', {
                    user_id: userData.user_id,
                    school_id: userData.school_id,
                    user_level: userData.user_level_name,
                    timestamp: new Date().getTime() // Add timestamp for additional security
                });
    
                // Check 2FA status first using backend fetch2FA
                let canSendLoginOtp = false;
                let twoFaData = null;
                let shouldBypass2FA = false;
                
                try {
                    const twoFaResp = await axios.post(`${apiUrl}login.php`, {
                        operation: "fetch2FA",
                        json: { user_id: userData.user_id }
                    }, {
                        timeout: 15000 // 15 seconds timeout
                    });
                    twoFaData = twoFaResp.data;
                    
                    if (twoFaData && twoFaData.status === "expired") {
                        // 2FA has expired, bypass OTP and proceed to direct login
                        console.log("2FA expired, proceeding with direct login");
                        shouldBypass2FA = true;
                    } else if (twoFaData && twoFaData.status === "success" && twoFaData.requires_verification === false) {
                        // No 2FA record found, bypass OTP and proceed to direct login
                        shouldBypass2FA = true;
                    } else if (twoFaData && twoFaData.status === "success" && twoFaData.requires_verification === true) {
                        // 2FA is active and valid, send OTP
                        canSendLoginOtp = true;
                    } else {
                        // Other cases - show error and stop login
                        console.error("Unexpected 2FA response:", twoFaData);
                        notify(twoFaData?.message || "2FA verification required.", 'error');
                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    handleApiError(e, '2FA check');
                    setLoading(false);
                    return;
                }

                let otpResponse = { data: { status: 'error' } };
                if (canSendLoginOtp) {
                    // Send OTP using backend PHP method
                    try {
                        const otpResp = await axios.post(`${apiUrl}login.php`, {
                            operation: "sendLoginOTP",
                            json: { user_id: userData.user_id }
                        }, {
                            timeout: 15000 // 15 seconds timeout
                        });
                        otpResponse = { data: otpResp.data };
                    } catch (otpError) {
                        handleApiError(otpError, 'Send login OTP');
                        setLoading(false);
                        return;
                    }
                } else if (shouldBypass2FA) {
                    // 2FA expired or not found; bypass OTP and proceed to direct login branch
                    otpResponse = { data: { status: 'success', requires_2fa: false } };
                }
                
                // Check the specific message from the API
                if (otpResponse.data.status === "success") {
                    if (otpResponse.data.otp) {
                        // Store user_id and email temporarily for OTP verification
                        SecureStorage.setSessionItem("temp_user_id", userData.user_id);
                        SecureStorage.setSessionItem("temp_user_email", userData.email);
                        setLoginPassword(password); // Store password for OTP context
                        
                        // Store OTP and expiration in frontend state (no server storage)
                        // Set timezone to Asia/Manila for expiration calculation
                        const now = new Date();
                        const manilaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
                        const expirationTime = new Date(manilaTime.getTime() + 3 * 60 * 1000); // 3 minutes from now in Manila time
                        setLoginOtpExpiration(expirationTime);
                        setStoredLoginOTP(otpResponse.data.otp); // Store the OTP from response
                        
                        // Reset login OTP states
                        setLoginOtpDigits(Array(6).fill(''));
                        setLoginResendTimer(180); // 3 minutes
                        setCanResendLoginOtp(false);
                        
                        // Show OTP input form
                        setShowLoginOTP(true);
                        notify("OTP has been sent to your email. Please verify.");
                        setLoading(false);
                        return;
                    } else {
                        // 2FA is not active, proceed with direct login
                        console.log("2FA not active - proceeding with direct login");
                        
                        // Save API URL before clearing localStorage
                        const savedApiUrl = apiUrl;
                        
                        localStorage.clear();
                        sessionStorage.clear();
                        
                        // Restore API URL
                        SecureStorage.setLocalItem("url", savedApiUrl);
                
                        // Set localStorage items securely
                        SecureStorage.setLocalItem("user_id", userData.user_id);
                        SecureStorage.setLocalItem("name", `${userData.title_abbreviation} ${userData.firstname} ${userData.middlename} ${userData.lastname} ${userData.suffix}`.trim());
                        SecureStorage.setLocalItem("school_id", userData.school_id);
                        SecureStorage.setLocalItem("email", userData.email);
                        SecureStorage.setLocalItem("Department Name", userData.department_name);
                        SecureStorage.setLocalItem("contact_number", userData.contact_number);
                        SecureStorage.setLocalItem("user_level", userData.user_level_name);
                        SecureStorage.setLocalItem("user_level_id", userData.user_level_id);
                        SecureStorage.setLocalItem("department_id", userData.department_id);
                        SecureStorage.setLocalItem("profile_pic", userData.profile_pic || "");
                        SecureStorage.setLocalItem("loggedIn", "true");
                        SecureStorage.setLocalItem("lastActivity", Date.now().toString());
                        

                        SecureStorage.setSessionItem("user_id", userData.user_id);
                        SecureStorage.setSessionItem("name", `${userData.title_abbreviation} ${userData.firstname} ${userData.middlename} ${userData.lastname} ${userData.suffix}`.trim());
                        SecureStorage.setSessionItem("school_id", userData.school_id);
                        SecureStorage.setSessionItem("email", userData.email);
                        SecureStorage.setSessionItem("Department Name", userData.department_name);
                        SecureStorage.setSessionItem("contact_number", userData.contact_number);
                        SecureStorage.setSessionItem("user_level", userData.user_level_name);
                        SecureStorage.setSessionItem("user_level_id", userData.user_level_id);
                        SecureStorage.setSessionItem("department_id", userData.department_id);
                        SecureStorage.setSessionItem("profile_pic", userData.profile_pic || "");
                        SecureStorage.setSessionItem("loggedIn", "true");

                        refreshSessionCookie('userSession');
                
                        // --- PUSH NOTIFICATION SUBSCRIPTION ---
                        console.log("[DEBUG] About to check push notification manager block");
                        if (window.pushNotificationManager) {
                            const userId = SecureStorage.getLocalItem("user_id");
                            console.log("[DEBUG] pushNotificationManager exists, subscribing for user:", userId);
                            window.pushNotificationManager.subscribe(userId)
                                .then(() => {
                                    console.log("[DEBUG] Push subscription successful for user:", userId);
                                })
                                .catch((err) => {
                                    console.error("[DEBUG] Push subscription failed:", err);
                                });
                        } else {
                            console.warn("[DEBUG] Push notification manager not available (window.pushNotificationManager is falsy)");
                        }
                        // --- END PUSH NOTIFICATION SUBSCRIPTION ---
                
                        // Handle "Remember Me" functionality
                        if (rememberMe) {
                            localStorage.setItem("rememberedUsername", username);
                        } else {
                            localStorage.removeItem("rememberedUsername");
                        }

                        // Log user data and storage operations
                        console.log("User data:", userData);
                        console.log("Setting user level:", userData.user_level_name);
                    
                        
                        // Get the stored user level (it's automatically decrypted by getLocalItem)
                        const userLevel = SecureStorage.getLocalItem("user_level");
                        console.log("Retrieved user level:", userLevel);

                        // Navigate based on user level
                        switch(userLevel) {
                            case "Super Admin":
                                notify("Super Admin Login Successful");
                                setTimeout(() => navigateTo("/Admin/Dashboard"), 100);
                                break;
                            case "Personnel":
                                notify("Personnel Login Successful");
                                setTimeout(() => navigateTo("/Personnel/Dashboard"), 100);
                                break;
                            case "Admin":
                                notify("Admin Login Successful");
                                setTimeout(() => navigateTo("/Admin/Dashboard"), 100);
                                break;
                            case "Dean":
                                notify("Dean Login Successful");
                                setTimeout(() => navigateTo("/Department/Dashboard"), 100);
                                break;
                            case "Principal":
                                notify("Principal Login Successful");
                                setTimeout(() => navigateTo("/Department/Dashboard"), 100);
                                break;
                            case "Department Head":
                                notify("Department Head Login Successful");
                                setTimeout(() => navigateTo("/Department/Dashboard"), 100);
                                break;
                            case "Secretary":
                                notify("Secretary Login Successful");
                                setTimeout(() => navigateTo("/Department/Dashboard"), 100);
                                break;
                            case "Driver":
                                notify("Driver Login Successful");
                                setTimeout(() => navigateTo("/Driver/Dashboard"), 100);
                                break;
                            default:
                                notify("User Login Successful");
                                setTimeout(() => navigateTo("/Faculty/Dashboard"), 100);
                        }
                    }
                } else {
                    notify(otpResponse.data.message || "Failed to check 2FA status", 'error');
                    setLoading(false);
                    return;
                }
            } else {
                // Password is incorrect
                notify("Incorrect password. Please try again.", 'error');
                generateCaptcha();
            }
        } catch (error) {
            handleApiError(error, 'Login');
            removeSessionCookie('userSession');
            generateCaptcha();
            // Clear any stored passwords on error
            setCurrentPassword('');
            setLoginPassword('');
            // Clear login OTP states on error
            setStoredLoginOTP(null);
            setLoginOtpExpiration(null);
            setShowLoginOTP(false);
        } finally {
            setLoading(false);
        }
    };

    // OTP Email Check Method
    const handleCheckEmail = async () => {
        if (!email) {
            notify("Please enter your email address", 'error');
            return;
        }

        setLoading(true);
        try {
            const apiUrl = SecureStorage.getLocalItem("url");
            if (!apiUrl) {
                notify("API URL configuration is missing. Please contact support.", 'error');
                setLoading(false);
                return;
            }

            // Step 1: Check if email exists in database
            const checkEmailResponse = await axios.post(`${apiUrl}login.php`, {
                operation: "checkEmail",
                json: { email: email.trim().toLowerCase() }
            }, {
                timeout: 15000 // 15 seconds timeout
            });

            console.log("CheckEmail response:", checkEmailResponse.data);

            // If email doesn't exist, show error and stop
            if (checkEmailResponse.data.status === "available") {
                notify("User Has No Record To This System", 'error');
                setLoading(false);
                return;
            }

            if (checkEmailResponse.data.status === "error") {
                notify(checkEmailResponse.data.message || "Error checking email", 'error');
                setLoading(false);
                return;
            }

            // Step 2: Email exists, now send OTP
            if (checkEmailResponse.data.status === "exists") {
                const response = await axios.post(`${apiUrl}login.php`, {
                    operation: "send_password_reset_otp",
                    json: { email: email.trim().toLowerCase() }
                }, {
                    timeout: 15000 // 15 seconds timeout
                });

                if (response.data.status === "success") {
                    // Store OTP in state for frontend validation with 3-minute expiration
                    setStoredOTP(response.data.otp);
                    const expirationTime = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
                    setOtpExpiration(expirationTime);
                    
                    setShowOtpInput(true);
                    setResendTimer(180); // Reset timer (3 minutes)
                    setCanResendOtp(false);
                    notify("OTP sent to your email", 'success');
                } else {
                    notify(response.data.message || "Failed to send OTP", 'error');
                }
            }
        } catch (error) {
            handleApiError(error, 'Email verification');
        } finally {
            setLoading(false);
        }
    };

    // Send/Resend OTP Method
    const handleSendOTP = async (isResend = false) => {
        if (isResend) {
            // For resend, use the same email
            await handleCheckEmail();
            setResendTimer(180);
            setCanResendOtp(false);
        } else {
            await handleCheckEmail();
        }
        
        // if (!isResend && !isForgotPasswordCaptchaCorrect) {
        //     notify("Please complete the CAPTCHA verification", 'error');
        //     return;
        // }

        // if (isResend) {
        //     setIsResending(true);
        // } else {
        //     // setIsSendingOtp(true);
        // }

        // try {
        //     // Use Node.js API for password reset OTP
        //     const normalizedEmail = (email || '').trim().toLowerCase();
        //     const data = await sendPasswordResetOtpMail(
        //         normalizedEmail,
        //         'User'
        //     );
        //     console.log("SendOTP response:", data);

        //     if (data.status === "success") {
        //         // Store OTP and expiration for validation
        //         const expirationTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        //         setOtpExpiration(expirationTime);
        //         setStoredOTP(data.otp); // Store the OTP from response
        //         setStoredOtpOwner(normalizedEmail); // bind owner
                
        //         setShowOtpInput(true);
        //         setResendTimer(180); // Reset timer
        //         setCanResendOtp(false);
        //         notify(isResend ? "OTP resent successfully" : "OTP sent to your email", 'success');
        //     } else {
        //         notify(data.message || "Failed to send OTP", 'error');
        //     }
        // } catch (error) {
        //     notify(error.response?.data?.message || "Error sending OTP", 'error');
        // } finally {
        //     if (isResend) {
        //         setIsResending(false);
        //     } else {
        //         // setIsSendingOtp(false);
        //     }
        // }
    };

    const handleOtpChange = (index, value) => {
        if (value.length > 1) return; // Only allow single digit
        if (!/^\d*$/.test(value)) return; // Only allow numbers

        const newOtpDigits = [...otpDigits];
        newOtpDigits[index] = value;
        setOtpDigits(newOtpDigits);

        // Move to next input if value is entered
        if (value && index < 5) {
            otpRefs[index + 1].current.focus();
        }
        
        // Auto-verify if all digits are filled
        if (value && index === 5) {
            const allFilled = newOtpDigits.every(digit => digit !== '');
            if (allFilled) {
                handleVerifyOtp();
            }
        }
    };

    const handleKeyDown = (index, e) => {
        // Move to previous input on backspace if current input is empty
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            otpRefs[index - 1].current.focus();
        }
        // Trigger verification on Enter if all digits are filled
        if (e.key === 'Enter') {
            const allFilled = otpDigits.every(digit => digit !== '');
            if (allFilled) {
                handleVerifyOtp();
            }
        }
    };

    // Verify OTP Method (Frontend validation only)
    const handleVerifyOtp = async () => {
        const otpValue = otpDigits.map(d => (d || '').trim()).join('');
        if (otpValue.length !== 6) {
            // notify("Please enter complete OTP", 'error');
            return;
        }

        try {
            // Check if OTP has expired (3 minutes)
            if (otpExpiration && new Date() > otpExpiration) {
                notify("OTP has expired. Please request a new one.", 'error');
                setStoredOTP(null);
                setOtpExpiration(null);
                setOtpDigits(Array(6).fill(''));
                return;
            }

            // Validate OTP against frontend-stored value
            if (!storedOTP) {
                notify("No OTP found. Please request a new one.", 'error');
                setOtpDigits(Array(6).fill(''));
                return;
            }

            if (String(storedOTP) === String(otpValue)) {
                setShowPasswordReset(true);
                // Keep showOtpInput as true so the password reset form displays
                notify("OTP verified successfully", 'success');
                
                // Clear OTP data
                setStoredOTP(null);
                setOtpExpiration(null);
            } else {
                notify("Invalid OTP. Please try again.", 'error');
                setOtpDigits(Array(6).fill(''));
            }
        } catch (error) {
            console.error("OTP validation error:", error);
            notify("Error validating OTP", 'error');
            setOtpDigits(Array(6).fill(''));
        }
    };

    const handlePasswordReset = async () => {
        if (!isPasswordValid()) {
            notify("Please ensure password meets all requirements", 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            notify("Passwords do not match", 'error');
            return;
        }

        try {
            const response = await axios.post(`${SecureStorage.getLocalItem("url")}login.php`, {
                operation: "update_password",
                json: {
                    email: email,
                    new_password: newPassword
                }
            });

            if (response.data.status === "success") {
                notify("Password successfully updated");
                handleModalClose();
            } else {
                notify(response.data.message || "Failed to update password", 'error');
            }
        } catch (error) {
            notify("Error updating password", 'error');
        }
    };

    // Login OTP handling functions
    const handleLoginOtpChange = (index, value) => {
        if (value.length > 1) return; // Only allow single digit
        if (!/^\d*$/.test(value)) return; // Only allow numbers

        const newOtpDigits = [...loginOtpDigits];
        newOtpDigits[index] = value;
        setLoginOtpDigits(newOtpDigits);

        // Move to next input if value is entered
        if (value && index < 5) {
            loginOtpRefs[index + 1].current.focus();
        }
        
        // Auto-verify if all digits are filled
        if (value && index === 5) {
            const allFilled = newOtpDigits.every(digit => digit !== '');
            if (allFilled) {
                handleVerifyLoginOtp();
            }
        }
    };

    const handleLoginOtpKeyDown = (index, e) => {
        // Move to previous input on backspace if current input is empty
        if (e.key === 'Backspace' && !loginOtpDigits[index] && index > 0) {
            loginOtpRefs[index - 1].current.focus();
        }
        // Trigger verification on Enter if all digits are filled
        if (e.key === 'Enter') {
            const allFilled = loginOtpDigits.every(digit => digit !== '');
            if (allFilled) {
                handleVerifyLoginOtp();
            }
        }
    };

    // Verify Login OTP Method (Frontend validation only)
    const handleVerifyLoginOtp = async () => {
        const otpValue = loginOtpDigits.map(d => (d || '').trim()).join('');
        if (otpValue.length !== 6) {
            // notify("Please enter complete OTP", 'error');
            return;
        }

        setIsVerifyingLoginOtp(true);
        try {
            // Check if OTP has expired (3 minutes) using Asia/Manila timezone
            const now = new Date();
            const manilaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
            
            if (loginOtpExpiration && manilaTime > loginOtpExpiration) {
                notify("OTP has expired. Please request a new one.", 'error');
                setStoredLoginOTP(null);
                setLoginOtpExpiration(null);
                setLoginOtpDigits(Array(6).fill(''));
                return;
            }

            // Validate OTP against frontend-stored value
            if (!storedLoginOTP) {
                notify("No OTP found. Please request a new one.", 'error');
                setLoginOtpDigits(Array(6).fill(''));
                return;
            }

            if (String(storedLoginOTP) === String(otpValue)) {
                notify("Login OTP verified successfully", 'success');
                
                // Clear OTP data
                setStoredLoginOTP(null);
                setLoginOtpExpiration(null);
                setShowLoginOTP(false);
                
                // Proceed with login completion
                await completeLogin();
            } else {
                notify("Invalid OTP. Please try again.", 'error');
                setLoginOtpDigits(Array(6).fill(''));
            }
        } catch (error) {
            console.error("Login OTP validation error:", error);
            notify("Error validating OTP", 'error');
            setLoginOtpDigits(Array(6).fill(''));
        } finally {
            setIsVerifyingLoginOtp(false);
        }
    };

    // Resend Login OTP
    const handleResendLoginOtp = async () => {
        if (!canResendLoginOtp) return;
        
        setIsResendingLoginOtp(true);
        try {
            const userId = SecureStorage.getSessionItem("temp_user_id");
            const apiUrl = SecureStorage.getLocalItem("url");
            
            const response = await axios.post(`${apiUrl}login.php`, {
                operation: "sendLoginOTP",
                json: { user_id: userId }
            });
            
            if (response.data.status === "success" && response.data.otp) {
                // Store new OTP and reset expiration
                const now = new Date();
                const manilaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
                const expirationTime = new Date(manilaTime.getTime() + 3 * 60 * 1000);
                setLoginOtpExpiration(expirationTime);
                setStoredLoginOTP(response.data.otp);
                
                // Reset timer and states
                setLoginResendTimer(180);
                setCanResendLoginOtp(false);
                setLoginOtpDigits(Array(6).fill(''));
                
                notify("New OTP sent to your email", 'success');
            } else {
                notify(response.data.message || "Failed to resend OTP", 'error');
            }
        } catch (error) {
            console.error("Resend login OTP error:", error);
            notify("Error resending OTP", 'error');
        } finally {
            setIsResendingLoginOtp(false);
        }
    };

    // Complete login after successful OTP verification
    const completeLogin = async () => {
        try {
            // const userId = SecureStorage.getSessionItem("temp_user_id");
            // const userEmail = SecureStorage.getSessionItem("temp_user_email");
            const apiUrl = SecureStorage.getLocalItem("url");
            
            // Re-authenticate to get fresh user data
            const loginResponse = await axios.post(`${apiUrl}login.php`, {
                operation: "login",
                json: { 
                    username: username, 
                    password: loginPassword 
                }
            });
            
            if (loginResponse.data.status === "success") {
                const userData = loginResponse.data.data;
                
                // Save API URL before clearing localStorage
                const savedApiUrl = apiUrl;
                
                localStorage.clear();
                sessionStorage.clear();
                
                // Restore API URL
                SecureStorage.setLocalItem("url", savedApiUrl);
        
                // Set localStorage items securely
                SecureStorage.setLocalItem("user_id", userData.user_id);
                SecureStorage.setLocalItem("name", `${userData.title_abbreviation} ${userData.firstname} ${userData.middlename} ${userData.lastname} ${userData.suffix}`.trim());
                SecureStorage.setLocalItem("school_id", userData.school_id);
                SecureStorage.setLocalItem("email", userData.email);
                SecureStorage.setLocalItem("Department Name", userData.department_name);
                SecureStorage.setLocalItem("contact_number", userData.contact_number);
                SecureStorage.setLocalItem("user_level", userData.user_level_name);
                SecureStorage.setLocalItem("user_level_id", userData.user_level_id);
                SecureStorage.setLocalItem("department_id", userData.department_id);
                SecureStorage.setLocalItem("profile_pic", userData.profile_pic || "");
                SecureStorage.setLocalItem("loggedIn", "true");
                SecureStorage.setLocalItem("lastActivity", Date.now().toString());
                

                SecureStorage.setSessionItem("user_id", userData.user_id);
                SecureStorage.setSessionItem("name", `${userData.title_abbreviation} ${userData.firstname} ${userData.middlename} ${userData.lastname} ${userData.suffix}`.trim());
                SecureStorage.setSessionItem("school_id", userData.school_id);
                SecureStorage.setSessionItem("email", userData.email);
                SecureStorage.setSessionItem("Department Name", userData.department_name);
                SecureStorage.setSessionItem("contact_number", userData.contact_number);
                SecureStorage.setSessionItem("user_level", userData.user_level_name);
                SecureStorage.setSessionItem("user_level_id", userData.user_level_id);
                SecureStorage.setSessionItem("department_id", userData.department_id);
                SecureStorage.setSessionItem("profile_pic", userData.profile_pic || "");
                SecureStorage.setSessionItem("loggedIn", "true");

                refreshSessionCookie('userSession');
        
                // --- PUSH NOTIFICATION SUBSCRIPTION ---
                console.log("[DEBUG] About to check push notification manager block");
                if (window.pushNotificationManager) {
                    const userId = SecureStorage.getLocalItem("user_id");
                    console.log("[DEBUG] pushNotificationManager exists, subscribing for user:", userId);
                    window.pushNotificationManager.subscribe(userId)
                        .then(() => {
                            console.log("[DEBUG] Push subscription successful for user:", userId);
                        })
                        .catch((err) => {
                            console.error("[DEBUG] Push subscription failed:", err);
                        });
                } else {
                    console.warn("[DEBUG] Push notification manager not available (window.pushNotificationManager is falsy)");
                }
                // --- END PUSH NOTIFICATION SUBSCRIPTION ---
        
                // Handle "Remember Me" functionality
                if (rememberMe) {
                    localStorage.setItem("rememberedUsername", username);
                } else {
                    localStorage.removeItem("rememberedUsername");
                }

                // Log user data and storage operations
                console.log("User data:", userData);
                console.log("Setting user level:", userData.user_level_name);
            
                
                // Get the stored user level (it's automatically decrypted by getLocalItem)
                const userLevel = SecureStorage.getLocalItem("user_level");
                console.log("Retrieved user level:", userLevel);

                // Navigate based on user level
                switch(userLevel) {
                    case "Super Admin":
                        notify("Super Admin Login Successful");
                        setTimeout(() => navigateTo("/Admin/Dashboard"), 100);
                        break;
                    case "Personnel":
                        notify("Personnel Login Successful");
                        setTimeout(() => navigateTo("/Personnel/Dashboard"), 100);
                        break;
                    case "Admin":
                        notify("Admin Login Successful");
                        setTimeout(() => navigateTo("/Admin/Dashboard"), 100);
                        break;
                    case "Dean":
                        notify("Dean Login Successful");
                        setTimeout(() => navigateTo("/Department/Dashboard"), 100);
                        break;
                    case "Principal":
                        notify("Principal Login Successful");
                        setTimeout(() => navigateTo("/Department/Dashboard"), 100);
                        break;
                    case "Department Head":
                        notify("Department Head Login Successful");
                        setTimeout(() => navigateTo("/Department/Dashboard"), 100);
                        break;
                    case "Secretary":
                        notify("Secretary Login Successful");
                        setTimeout(() => navigateTo("/Department/Dashboard"), 100);
                        break;
                    case "Driver":
                        notify("Driver Login Successful");
                        setTimeout(() => navigateTo("/Driver/Dashboard"), 100);
                        break;
                    default:
                        notify("User Login Successful");
                        setTimeout(() => navigateTo("/Faculty/Dashboard"), 100);
                }
                
                // Clear temp session items
                sessionStorage.removeItem("temp_user_id");
                sessionStorage.removeItem("temp_user_email");
                setLoginPassword('');
            } else {
                notify(loginResponse.data.message || "Login failed after OTP verification", 'error');
                setLoading(false);
            }
        } catch (error) {
            console.error("Complete login error:", error);
            notify("Error completing login", 'error');
            setLoading(false);
        }
    };

    const handleEmailKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCheckEmail();
        }
    };

    // Format timer display (MM:SS)
    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle modal close for login OTP
    const handleLoginOtpModalClose = () => {
        setShowLoginOTP(false);
        setLoginOtpDigits(Array(6).fill(''));
        setStoredLoginOTP(null);
        setLoginOtpExpiration(null);
        setLoginPassword('');
        // Clear temp session items
        sessionStorage.removeItem("temp_user_id");
        sessionStorage.removeItem("temp_user_email");
    };

    const handlePasswordKeyPress = (e) => {
        if (e.key === 'Enter' && isPasswordValid() && newPassword === confirmPassword) {
            handlePasswordReset();
        }
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const handleModalClose = () => {
        setShowForgotPassword(false);
        setEmail(''); // Clear email on modal close
        setShowCaptchaAfterEmail(false);
        setOtpDigits(Array(6).fill(''));
        setShowOtpInput(false);
        setShowPasswordReset(false);
        setNewPassword('');
        setConfirmPassword('');
        setResendTimer(180);
        setCanResendOtp(false);
        setStoredOTP(null);
        setOtpExpiration(null);
    };


    const checkPasswordStrength = (password) => {
        return {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
    };

    const handleNewPasswordChange = (e) => {
        const password = e.target.value;
        setNewPassword(password);
        setPasswordStrength(checkPasswordStrength(password));
    };

    const isPasswordValid = () => {
        return Object.values(passwordStrength).every(value => value === true);
    };

    // const handleLoginOtpChange = (index, value) => {
    //     if (value.length > 1) return;

    //     const newOtpDigits = [...loginOtpDigits];
    //     newOtpDigits[index] = value;
    //     setLoginOtpDigits(newOtpDigits);

    //     if (value && index < 5) {
    //         loginOtpRefs[index + 1].current.focus();
    //     }
    // };

    // const handleLoginOtpKeyDown = (index, e) => {
    //     if (e.key === 'Backspace' && !loginOtpDigits[index] && index > 0) {
    //         loginOtpRefs[index - 1].current.focus();
    //     }
    // };

    // // COMMENTED OUT: Login OTP Verification Method
    // const handleVerifyLoginOTP = async () => {
    //     notify("Login OTP verification is temporarily disabled", 'error');
    //     return;
        
    //     // const otpValue = loginOtpDigits.join('');
    //     // if (otpValue.length !== 6) {
    //     //     notify("Please enter complete OTP", 'error');
    //     //     return;
    //     // }

    //     // setIsVerifyingLoginOtp(true);
    //     // try {
    //     //     // Check if OTP has expired
    //     //     if (otpExpiration && new Date() > otpExpiration) {
    //     //         notify("OTP has expired. Please request a new one.", 'error');
    //     //         setStoredOTP(null);
    //     //         setOtpExpiration(null);
    //     //         return;
    //     //     }

    //     //     // Verify OTP against frontend-stored value
    //     //     if (otpValue !== storedOTP) {
    //     //         notify("Invalid OTP. Please try again.", 'error');
    //     //         setLoginOtpDigits(Array(6).fill(''));
    //     //         return;
    //     //     }

    //     //     // OTP is valid, proceed with login
    //     //     console.log("OTP verified successfully");

    //     //     // Clear OTP data
    //     //     setStoredOTP(null);
    //     //     setOtpExpiration(null);

    //     //     // Get user_id and API URL
    //     //     const userData = SecureStorage.getSessionItem("temp_user_id");
    //     //     const apiUrl = SecureStorage.getLocalItem("url");

    //     //     // Get user details for login completion
    //     //     const userResponse = await axios.post(`${apiUrl}Admin.php`, {
    //     //         operation: "fetchUsersById",
    //     //         id: userData
    //     //     });

    //     //     if (userResponse.data.status === "success" && 
    //     //         userResponse.data.data && 
    //     //         userResponse.data.data.length > 0) {
                
    //     //         const userDetails = userResponse.data.data[0];

    //     //         // Check if this is the first login and password needs to be changed
    //     //         if (userDetails.first_login === true) {
    //     //             console.log("First login detected after OTP verification, forcing password change");
    //     //             setCurrentPassword(loginPassword); // Store current password for comparison
    //     //             setShowForcePassword(true);
    //     //             setShowLoginOTP(false);
    //     //             return;
    //     //         }
                
    //     //         // Clear existing storage but preserve API URL
    //     //         localStorage.clear();
    //     //         sessionStorage.clear();
                
    //     //         // Restore API URL
    //     //         SecureStorage.setLocalItem("url", apiUrl);
                
    //     //         // Set localStorage items securely using the correct field names
    //     //         SecureStorage.setLocalItem("user_id", userDetails.users_id);
    //     //         SecureStorage.setLocalItem("name", `${userDetails.title_abbreviation} ${userDetails.users_fname} ${userDetails.users_mname} ${userDetails.users_lname} ${userDetails.users_suffix}`.trim());
    //     //         SecureStorage.setLocalItem("school_id", userDetails.users_school_id);
    //     //         SecureStorage.setLocalItem("email", userDetails.users_email);
    //     //         SecureStorage.setLocalItem("Department Name", userDetails.department_name);
    //     //         SecureStorage.setLocalItem("contact_number", userDetails.users_contact_number);
    //     //         SecureStorage.setLocalItem("user_level", userDetails.user_level_name);
    //     //         SecureStorage.setLocalItem("user_level_id", userDetails.users_user_level_id);
    //     //         SecureStorage.setLocalItem("department_id", userDetails.users_department_id);
    //     //         SecureStorage.setLocalItem("profile_pic", userDetails.users_pic || "");
    //     //         SecureStorage.setLocalItem("loggedIn", "true");
    //     //         SecureStorage.setLocalItem("lastActivity", Date.now().toString());
                
    //     //         // Set session storage items
    //     //         SecureStorage.setSessionItem("user_id", userDetails.users_id);
    //     //         SecureStorage.setSessionItem("name", `${userDetails.title_abbreviation} ${userDetails.users_fname} ${userDetails.users_mname} ${userDetails.users_lname} ${userDetails.users_suffix}`.trim());
    //     //         SecureStorage.setSessionItem("school_id", userDetails.users_school_id);
    //     //         SecureStorage.setSessionItem("email", userDetails.users_email);
    //     //         SecureStorage.setSessionItem("Department Name", userDetails.department_name);
    //     //         SecureStorage.setSessionItem("contact_number", userDetails.users_contact_number);
    //     //         SecureStorage.setSessionItem("user_level", userDetails.user_level_name);
    //     //         SecureStorage.setSessionItem("user_level_id", userDetails.users_user_level_id);
    //     //         SecureStorage.setSessionItem("department_id", userDetails.users_department_id);
    //     //         SecureStorage.setSessionItem("profile_pic", userDetails.users_pic || "");
    //     //         SecureStorage.setSessionItem("loggedIn", "true");

    //     //         refreshSessionCookie('userSession');

    //     //         // --- PUSH NOTIFICATION SUBSCRIPTION ---
    //     //         if (window.pushNotificationManager) {
    //     //             const userId = SecureStorage.getLocalItem("user_id");
    //     //             window.pushNotificationManager.subscribe(userId)
    //     //                 .then(() => {
    //     //                     console.log("Push subscription successful for user:", userId);
    //     //                 })
    //     //                 .catch((err) => {
    //     //                     console.error("Push subscription failed:", err);
    //     //                 });
    //     //         }

    //     //         // Handle "Remember Me" functionality
    //     //         if (rememberMe) {
    //     //             localStorage.setItem("rememberedUsername", username);
    //     //         } else {
    //     //             localStorage.removeItem("rememberedUsername");
    //     //         }

    //     //         // Navigate based on user level
    //     //         const userLevel = userDetails.user_level_name;
    //     //         switch(userLevel) {
    //     //             case "Super Admin":
    //     //                 notify("Super Admin Login Successful");
    //     //                 setTimeout(() => navigateTo("/Admin/Dashboard"), 100);
    //     //                 break;
    //     //             case "Personnel":
    //     //                 notify("Personnel Login Successful");
    //     //                 setTimeout(() => navigateTo("/Personnel/Dashboard"), 100);
    //     //                 break;
    //     //             case "Admin":
    //     //                 notify("Admin Login Successful");
    //     //                 setTimeout(() => navigateTo("/Admin/Dashboard"), 100);
    //     //                 break;
    //     //             case "Dean":
    //     //             case "Department Head":
    //     //             case "Secretary":
    //     //                 notify("Dean Login Successful");
    //     //                 setTimeout(() => navigateTo("/Department/Dashboard"), 100);
    //     //                 break;
    //     //             case "Driver":
    //     //                 notify("Driver Login Successful");
    //     //                 setTimeout(() => navigateTo("/Driver/Dashboard"), 100);
    //     //                 break;
    //     //             default:
    //     //                 notify("User Login Successful");
    //     //                 setTimeout(() => navigateTo("/Faculty/Dashboard"), 100);
    //     //         }
    //     //     } else {
    //     //         notify("Failed to get user details", 'error');
    //     //     }
    //     // } catch (error) {
    //     //     console.error('OTP verification error:', error);
    //     //     notify("OTP verification failed. Please try again.", 'error');
    //     //     // Clear any stored passwords on error
    //     //     setCurrentPassword('');
    //     //     setLoginPassword('');
    //     // } finally {
    //     //     setIsVerifyingLoginOtp(false);
    //     // }
    // };

    // // COMMENTED OUT: Resend Login OTP Method
    // const handleResendLoginOTP = async () => {
    //     notify("Resend login OTP is temporarily disabled", 'error');
    //     return;
        
    //     // setIsResendingLoginOtp(true);
    //     // try {
    //     //     const userData = SecureStorage.getSessionItem("temp_user_id");
            
    //     //     const response = await sendLoginOtpMail(
    //     //         userData || username,
    //     //         null,
    //     //         null
    //     //     );

    //     //     if (response.status === "success") {
    //     //         setLoginResendTimer(180);
    //     //         setCanResendLoginOtp(false);
                
    //     //         if (response.requires_2fa) {
    //     //             // Generate new OTP for frontend verification
    //     //             const frontendOTP = Math.floor(100000 + Math.random() * 900000).toString();
    //     //             setStoredOTP(frontendOTP);
                    
    //     //             // Reset expiration time
    //     //             const expirationTime = new Date(Date.now() + 3 * 60 * 1000);
    //     //             setOtpExpiration(expirationTime);
                    
    //     //             notify("OTP has been resent to your email");
    //     //         } else {
    //     //             notify("2FA is not active for this user");
    //     //         }
    //     //     } else {
    //     //         notify(response.data.message || "Failed to resend OTP", 'error');
    //     //     }
    //     // } catch (error) {
    //     //     notify("Error resending OTP", 'error');
    //     // } finally {
    //     //     setIsResendingLoginOtp(false);
    //     // }
    // };

    const handlePasswordChanged = async () => {
        // After password is changed, proceed with the normal login flow
        setShowForcePassword(false);
        setCurrentPassword('');
        // setLoginPassword(''); // Clear stored password
        
        // Re-authenticate with the new password
        try {
            const apiUrl = SecureStorage.getLocalItem("url");
            const userId = SecureStorage.getSessionItem("temp_user_id");
            
            // Get user details again to proceed with login
            const userResponse = await axios.post(`${apiUrl}Admin.php`, {
                operation: "fetchUsersById",
                id: userId
            });
            
            if (userResponse.data.status === "success" && 
                userResponse.data.data && 
                userResponse.data.data.length > 0) {
                
                const userData = userResponse.data.data[0];
                
                // Clear existing storage but preserve API URL
                localStorage.clear();
                sessionStorage.clear();
                
                // Restore API URL
                SecureStorage.setLocalItem("url", apiUrl);

                // Set localStorage items securely
                SecureStorage.setLocalItem("user_id", userData.users_id);
                SecureStorage.setLocalItem("name", `${userData.title_abbreviation} ${userData.users_fname} ${userData.users_mname} ${userData.users_lname} ${userData.users_suffix}`.trim());
                SecureStorage.setLocalItem("school_id", userData.users_school_id);
                SecureStorage.setLocalItem("contact_number", userData.users_contact_number);
                SecureStorage.setLocalItem("user_level", userData.user_level_name);
                SecureStorage.setLocalItem("user_level_id", userData.users_user_level_id);
                SecureStorage.setLocalItem("department_id", userData.users_department_id);
                SecureStorage.setLocalItem("profile_pic", userData.users_pic || "");
                SecureStorage.setLocalItem("loggedIn", "true");
                SecureStorage.setLocalItem("lastActivity", Date.now().toString());
            
                // Set sessionStorage items securely
                SecureStorage.setSessionItem("user_id", userData.users_id);
                SecureStorage.setSessionItem("name", `${userData.title_abbreviation} ${userData.users_fname} ${userData.users_mname} ${userData.users_lname} ${userData.users_suffix}`.trim());
                SecureStorage.setSessionItem("school_id", userData.users_school_id);
                SecureStorage.setSessionItem("contact_number", userData.users_contact_number);
                SecureStorage.setSessionItem("user_level", userData.user_level_name);
                SecureStorage.setSessionItem("user_level_id", userData.users_user_level_id);
                SecureStorage.setSessionItem("department_id", userData.users_department_id);
                SecureStorage.setSessionItem("profile_pic", userData.users_pic || "");
                SecureStorage.setSessionItem("loggedIn", "true");
                
                // Set session cookie
                setSessionCookie('userSession', {
                    user_id: userData.users_id,
                    school_id: userData.users_school_id,
                    user_level: userData.user_level_name,
                    timestamp: new Date().getTime()
                });
                
                // Handle "Remember Me" functionality
                if (rememberMe) {
                    localStorage.setItem("rememberedUsername", username);
                } else {
                    localStorage.removeItem("rememberedUsername");
                }
                
                // Navigate based on user level
                const userLevel = userData.user_level_name;
                switch(userLevel) {
                    case "Super Admin":
                        notify("Super Admin Login Successful");
                        setTimeout(() => navigateTo("/Admin/Dashboard"), 100);
                        break;
                    case "Personnel":
                        notify("Personnel Login Successful");
                        setTimeout(() => navigateTo("/Personnel/Dashboard"), 100);
                        break;
                    case "Admin":
                        notify("Admin Login Successful");
                        setTimeout(() => navigateTo("/Admin/Dashboard"), 100);
                        break;
                    case "Dean":
                    case "Principal":
                    case "Department Head":
                    case "Secretary":
                        notify("Dean Login Successful");
                        setTimeout(() => navigateTo("/Department/Dashboard"), 100);
                        break;
                    case "Driver":
                        notify("Driver Login Successful");
                        setTimeout(() => navigateTo("/Driver/Dashboard"), 100);
                        break;
                    default:
                        notify("User Login Successful");
                        setTimeout(() => navigateTo("/Faculty/Dashboard"), 100);
                }
            } else {
                notify("Failed to retrieve user data after password change", 'error');
                navigateTo("/");
            }
        } catch (error) {
            console.error('Error after password change:', error);
            // notify("Error completing login after password change", 'error');
            navigateTo("/");
        }
    };

    // If force password change is required, show the ForcePassword component
    if (showForcePassword) {
        return (
            <ForcePassword 
                onPasswordChanged={handlePasswordChanged}
                currentPassword={currentPassword}
            />
        );
    }

    return (
        <div className="min-h-screen bg-accent-light overflow-hidden font-sans">
            <div className="relative h-full min-h-screen flex flex-col lg:flex-row">
                {/* Decoration Elements */}
                <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-r from-primary-dark to-accent-dark transform -skew-y-6 origin-top-right -translate-y-40 z-0"></div>
                
                {/* Left Section - Branding and Features */}
                <div className="hidden lg:flex lg:w-1/2 relative z-10 bg-accent-light shadow-2xl">
                    <div className="absolute inset-0 overflow-hidden">
                        {/* Abstract Background Pattern */}
                        <svg className="absolute left-0 top-0 h-full w-full transform translate-x-1/2" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
                            <g fill="none" stroke="rgba(0, 128, 128, 0.05)" strokeWidth="2">
                                <circle cx="400" cy="400" r="200"/>
                                <circle cx="400" cy="400" r="250"/>
                                <circle cx="400" cy="400" r="300"/>
                                <circle cx="400" cy="400" r="350"/>
                                <circle cx="400" cy="400" r="400"/>
                            </g>
                            <rect x="300" y="300" width="200" height="200" fill="rgba(0, 128, 128, 0.03)" transform="rotate(45 400 400)"/>
                            <rect x="250" y="250" width="300" height="300" fill="rgba(0, 128, 128, 0.02)" transform="rotate(45 400 400)"/>
                        </svg>
                    </div>
                    
                    <div className="relative h-full w-full flex flex-col justify-center items-center px-12 py-24 z-10">
                        <div className="w-full max-w-md text-center mb-12">
                            <div className="flex justify-center mb-6">
                                <img 
                                    src={`${assetBasePath}/phinma.png`}
                                    alt="PHINMA CDO Logo" 
                                    className="w-24 h-24 object-contain filter drop-shadow-lg"
                                />
                            </div>
                            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-primary-dark to-accent-dark bg-clip-text text-transparent tracking-tight mb-3">
                                General Services Department
                            </h1>
                            <div className="h-1 w-24 mx-auto bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full mb-6"></div>
                            <h2 className="text-2xl font-medium text-gray-600 mb-8">
                                Reservation & Monitoring System
                            </h2>
                        </div>
                        
                       
                    </div>
                </div>
                
                {/* Right Section - Login Form */}
                <div className="w-full lg:w-1/2 flex justify-center items-center px-1 py-4 lg:px-1 relative z-10">
                    <div className="w-full max-w-[340px] mx-auto">
                        
                        {/* Mobile Logo (visible only on small screens) */}
                        <div className="flex flex-col items-center lg:hidden mb-10">
                            <img 
                                src={`${assetBasePath}/phinma.png`} 
                                alt="PHINMA CDO Logo" 
                                className="w-20 h-20 object-contain mb-4"
                            />
                            <h1 className="text-2xl font-bold text-center text-gray-800">General Services Department</h1>
                            <p className="text-gray-500 text-center">Reservation & Monitoring System</p>
                        </div>

                     
                           
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="bg-white rounded-xl shadow-xl overflow-hidden"
                            >
                                <div className="p-4">
                                    <div className="text-center mb-4">
                                        <div className="inline-flex items-center justify-center w-9 h-9 bg-emerald-100 rounded-full mb-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                            </svg>
                                        </div>
                                        <h2 className="text-lg font-bold text-gray-800">Welcome Back</h2>
                                        <p className="text-gray-500 mt-1 text-xs">Sign in to your account</p>
                                    </div>
                                    
                                    <form onSubmit={handleLogin} className="space-y-3">
                                        {/* Username Input */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Student ID / Employee ID</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <FaUser className="text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={username}
                                                    onChange={handleUsernameChange}
                                                    className="block w-full pl-12 pr-4 py-3.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ease-in-out"
                                                    placeholder="Enter your school ID"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Password Input */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Password</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <FaLock className="text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                                                </div>
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={password}
                                                    onChange={handlePasswordChange}
                                                    className="block w-full pl-12 pr-12 py-3.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ease-in-out"
                                                    placeholder="Enter your password"
                                                    required
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => setShowPassword(!showPassword)} 
                                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-emerald-500 transition-colors"
                                                >
                                                    {showPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* CAPTCHA */}
                                        <div className="space-y-4">
                                            <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                                <div className="p-4 bg-gray-50">
                                                    <canvas
                                                        ref={captchaCanvasRef}
                                                        width="280"
                                                        height="70"
                                                        className="w-full rounded-lg"
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center px-4 py-2 border-t border-gray-100">
                                                    <p className="text-xs text-gray-500">Enter the characters shown above</p>
                                                    <button
                                                        onClick={generateCaptcha}
                                                        className="p-2 text-emerald-600 hover:text-emerald-700 rounded-full hover:bg-emerald-50 transition-colors text-sm flex items-center"
                                                        type="button"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                                        </svg>
                                                        Refresh
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                type="text"
                                                value={userCaptchaInput}
                                                onChange={handleCaptchaInput}
                                                className={`block w-full px-4 py-3.5 bg-gray-50 border ${
                                                    isCaptchaCorrect === false ? 'border-red-500 bg-red-50' : 
                                                    isCaptchaCorrect === true ? 'border-emerald-500 bg-emerald-50' : 
                                                    'border-gray-200'
                                                } rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ease-in-out`}
                                                placeholder="Type the characters here"
                                                required
                                            />
                                            {isCaptchaCorrect === false && (
                                                <p className="mt-1 text-sm text-red-600 flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                    </svg>
                                                    Incorrect CAPTCHA. Please try again.
                                                </p>
                                            )}
                                        </div>

                                        {/* Remember Me and Forgot Password */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <input
                                                    id="remember-me"
                                                    name="remember-me"
                                                    type="checkbox"
                                                    checked={rememberMe}
                                                    onChange={(e) => setRememberMe(e.target.checked)}
                                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                                                />
                                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                                                    Remember me
                                                </label>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowForgotPassword(true)}
                                                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                                            >
                                                Forgot password?
                                            </button>
                                        </div>

                                        {/* Login Button */}
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-lg shadow-emerald-500/30 transition-all duration-200 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {loading ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Signing in...
                                                </>
                                            ) : (
                                                "Sign In"
                                            )}
                                        </button>
                                    </form>
                                </div>
                            </motion.div>
                        
                    </div>
                </div>
            </div>
            
            {/* We'll update the Modal in a separate edit */}
            <Toaster 
                position="top-right" 
                reverseOrder={false}
                toastOptions={{
                    style: {
                        borderRadius: '10px',
                        padding: '16px',
                        color: '#333',
                    },
                    success: {
                        style: {
                            background: '#f0fdf4',
                            border: '1px solid #dcfce7',
                            color: '#166534',
                        },
                        iconTheme: {
                            primary: '#16a34a',
                            secondary: '#ffffff',
                        },
                    },
                    error: {
                        style: {
                            background: '#fef2f2',
                            border: '1px solid #fee2e2',
                            color: '#b91c1c',
                        },
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#ffffff',
                        },
                    },
                }}
            />

            <Modal
                title={null}
                open={showForgotPassword}
                onCancel={handleModalClose}
                footer={null}
                maskClosable={false}
                width={340}
                className="modern-modal"
                closeIcon={
                    <span className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12"></path>
                        </svg>
                    </span>
                }
            >
                <div className="p-4">
                    <div className="text-center mb-4">
                        <div className="inline-flex items-center justify-center w-9 h-9 bg-emerald-100 rounded-full mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">Reset Your Password</h2>
                        <p className="text-gray-500 mt-1 text-xs">{!showOtpInput ? "Enter your email to receive a verification code" : showPasswordReset ? "Create a new secure password" : "Enter the verification code sent to your email (expires in 3 minutes)"}</p>
                    </div>

                    <div className="space-y-6">
                        {!showOtpInput ? (
                            <>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onKeyPress={handleEmailKeyPress}
                                            className="block w-full pl-12 pr-4 py-3.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ease-in-out"
                                            placeholder="Enter your email address"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleCheckEmail}
                                    disabled={loading}
                                    className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-lg shadow-emerald-500/30 transition-all duration-200 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Sending OTP...
                                        </>
                                    ) : (
                                        "Send Verification Code"
                                    )}
                                </button>
                            </>
                        ) : !showPasswordReset ? (
                            <div className="space-y-6">
                                <div className="bg-gray-50 p-4 rounded-xl text-center">
                                    <p className="text-gray-600 text-sm">A verification code has been sent to:</p>
                                    <p className="text-gray-900 font-medium mt-1">{email}</p>
                                </div>
                                
                                <div className="flex justify-between space-x-2">
                                    {otpDigits.map((digit, index) => (
                                        <input
                                            key={index}
                                            ref={otpRefs[index]}
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength="1"
                                            value={digit}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            className="w-full h-14 text-center text-xl font-medium bg-gray-50 border border-gray-200 rounded-xl shadow-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        />
                                    ))}
                                </div>
                                <div className="space-y-4">
                                    <button
                                        onClick={handleVerifyOtp}
                                        className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-lg shadow-emerald-500/30 transition-all duration-200 ease-in-out"
                                    >
                                        Verify Code
                                    </button>
                                    
                                    <div className="text-center">
                                        {!canResendOtp ? (
                                            <p className="text-sm text-gray-600 flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Resend code in {formatTime(resendTimer)}
                                            </p>
                                        ) : (
                                            <button
                                                onClick={() => handleSendOTP(true)}
                                                disabled={loading}
                                                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center justify-center mx-auto disabled:opacity-50"
                                            >
                                                {loading ? (
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                )}
                                                {loading ? 'Resending...' : 'Resend verification code'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">New Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <FaLock className="text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={handleNewPasswordChange}
                                            onKeyPress={handlePasswordKeyPress}
                                            className="block w-full pl-12 pr-12 py-3.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ease-in-out"
                                            placeholder="Create a strong password"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowPassword(!showPassword)} 
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-emerald-500 transition-colors"
                                        >
                                            {showPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className={`flex items-center p-2 rounded-lg ${passwordStrength.length ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500'}`}>
                                                <div className={`w-4 h-4 mr-2 rounded-full ${passwordStrength.length ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                                                <span className="text-xs">8+ characters</span>
                                            </div>
                                            <div className={`flex items-center p-2 rounded-lg ${passwordStrength.uppercase ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500'}`}>
                                                <div className={`w-4 h-4 mr-2 rounded-full ${passwordStrength.uppercase ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                                                <span className="text-xs">Uppercase</span>
                                            </div>
                                            <div className={`flex items-center p-2 rounded-lg ${passwordStrength.lowercase ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500'}`}>
                                                <div className={`w-4 h-4 mr-2 rounded-full ${passwordStrength.lowercase ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                                                <span className="text-xs">Lowercase</span>
                                            </div>
                                            <div className={`flex items-center p-2 rounded-lg ${passwordStrength.number ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500'}`}>
                                                <div className={`w-4 h-4 mr-2 rounded-full ${passwordStrength.number ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                                                <span className="text-xs">Number</span>
                                            </div>
                                        </div>
                                        <div className={`flex items-center p-2 rounded-lg ${passwordStrength.special ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500'}`}>
                                            <div className={`w-4 h-4 mr-2 rounded-full ${passwordStrength.special ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                                            <span className="text-xs">Special character (!@#$%^&*)</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <FaLock className="text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            onKeyPress={handlePasswordKeyPress}
                                            className={`block w-full pl-12 pr-4 py-3.5 text-gray-900 bg-gray-50 border ${
                                                newPassword !== confirmPassword && confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-200'
                                            } rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ease-in-out`}
                                            placeholder="Confirm your password"
                                        />
                                    </div>
                                    {newPassword !== confirmPassword && confirmPassword && (
                                        <p className="mt-1 text-sm text-red-600 flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                            Passwords do not match
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={handlePasswordReset}
                                    disabled={!isPasswordValid() || newPassword !== confirmPassword}
                                    className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-lg shadow-emerald-500/30 transition-all duration-200 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    Reset Password
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Login OTP Modal */}
            <Modal
                title={null}
                open={showLoginOTP}
                onCancel={handleLoginOtpModalClose}
                footer={null}
                maskClosable={false}
                width="90%"
                style={{ maxWidth: '380px' }}
                className="modern-modal"
                closeIcon={
                    <span className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12"></path>
                        </svg>
                    </span>
                }
            >
                <div className="p-4 sm:p-6">
                    <div className="text-center mb-4 sm:mb-6">
                        <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full mb-2 sm:mb-3" style={{backgroundColor: '#d4f4dc'}}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" style={{color: '#548e54'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800">Two-Factor Authentication</h2>
                        <p className="text-gray-500 mt-1 sm:mt-2 text-xs sm:text-sm px-2">
                            A verification code has been sent to your email address. Please enter the 6-digit code below to complete your login.
                        </p>
                    </div>

                    <div className="space-y-4 sm:space-y-6">
                        <div className="p-3 sm:p-4 rounded-xl text-center border" style={{backgroundColor: '#d4f4dc', borderColor: '#83b383'}}>
                            <p className="text-xs sm:text-sm font-medium" style={{color: '#548e54'}}>Verification code sent to:</p>
                            <p className="font-semibold mt-1 text-sm sm:text-base break-all" style={{color: '#145414'}}>{SecureStorage.getSessionItem("temp_user_email")}</p>
                        </div>
                        
                        <div className="flex justify-between space-x-2 sm:space-x-3">
                            {loginOtpDigits.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={loginOtpRefs[index]}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength="1"
                                    value={digit}
                                    onChange={(e) => handleLoginOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleLoginOtpKeyDown(index, e)}
                                    className="w-full h-12 sm:h-16 text-center text-lg sm:text-2xl font-bold bg-gray-50 border-2 border-gray-200 rounded-lg sm:rounded-xl shadow-sm focus:bg-white focus:outline-none transition-all"
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#548e54';
                                        e.target.style.boxShadow = '0 0 0 2px rgba(84, 142, 84, 0.2)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#d1d5db';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                    placeholder="•"
                                />
                            ))}
                        </div>

                        <div className="space-y-3 sm:space-y-4">
                            <button
                                onClick={handleVerifyLoginOtp}
                                disabled={isVerifyingLoginOtp || loginOtpDigits.some(digit => !digit)}
                                className="w-full flex justify-center items-center py-3 sm:py-4 px-4 border border-transparent rounded-lg sm:rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-lg transition-all duration-200 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
                                style={{
                                    background: `linear-gradient(to right, #548e54, #83b383)`,
                                    boxShadow: '0 10px 15px -3px rgba(84, 142, 84, 0.3)'
                                }}
                                onMouseEnter={(e) => {
                                    if (!e.target.disabled) {
                                        e.target.style.background = `linear-gradient(to right, #145414, #548e54)`;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!e.target.disabled) {
                                        e.target.style.background = `linear-gradient(to right, #548e54, #83b383)`;
                                    }
                                }}
                            >
                                {isVerifyingLoginOtp ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Verify & Login
                                    </>
                                )}
                            </button>
                            
                            <div className="text-center">
                                {!canResendLoginOtp ? (
                                    <p className="text-sm text-gray-600 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" style={{color: '#548e54'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Resend code in {formatTimer(loginResendTimer)}
                                    </p>
                                ) : (
                                    <button
                                        onClick={handleResendLoginOtp}
                                        disabled={isResendingLoginOtp}
                                        className="text-sm font-medium flex items-center justify-center mx-auto disabled:opacity-50 px-3 py-2 rounded-lg transition-colors"
                                        style={{color: '#548e54'}}
                                        onMouseEnter={(e) => {
                                            if (!e.target.disabled) {
                                                e.target.style.color = '#145414';
                                                e.target.style.backgroundColor = '#d4f4dc';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!e.target.disabled) {
                                                e.target.style.color = '#548e54';
                                                e.target.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        {isResendingLoginOtp ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Resending...
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Resend verification code
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                            <div className="flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 mt-0.5 mr-2 sm:mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <div>
                                    <p className="text-amber-800 text-xs sm:text-sm font-medium">Security Notice</p>
                                    <p className="text-amber-700 text-xs mt-0.5 sm:mt-1">
                                        Do not share this code with anyone.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Force Password Change Modal */}
            {showForcePassword && (
                <ForcePassword 
                    isOpen={showForcePassword}
                    onClose={() => setShowForcePassword(false)}
                    currentPassword={currentPassword}
                />
            )}
        </div>
    );
}

export default Logins;
