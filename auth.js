/**
 * AUTHENTICATION ENGINE
 * Handles Real OTP flow for National Deployment
 */

const Auth = {
    // 1. Check Session on Page Load
    init() {
        const saved = localStorage.getItem('bc_session');
        if (saved) {
            try {
                const session = JSON.parse(saved);
                // Check expiry (24 hours)
                if (new Date(session.expiresAt) > new Date()) {
                    // Valid session
                    if (window.AppState) window.AppState.currentUser = session;
                    this.onLoginSuccess(session);
                } else {
                    this.logout(); // Session expired
                }
            } catch (e) {
                console.error("Session Error", e);
                this.logout();
            }
        } else {
            // No session, show login modal
            this.openModal('login-modal');
            this.resetModal();
        }
    },

    // 2. Send OTP
    async sendOTP() {
        const email = document.getElementById('auth-email').value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email)) {
            Toast.show("Please enter a valid email address", "error");
            return;
        }

        // UI Feedback
        const btn = document.getElementById('btn-send-otp');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        btn.disabled = true;

        try {
            const res = await API.call('sendOTP', { email });
            
            if (res.success) {
                Toast.show("OTP sent to " + email, "success");
                this.switchStep('otp-step');
                document.getElementById('auth-display-email').innerText = email;
            } else {
                Toast.show(res.error, "error");
            }
        } catch (e) {
            Toast.show("Network Error", "error");
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    },

    // 3. Verify OTP
    async verifyOTP() {
        const email = document.getElementById('auth-display-email').innerText;
        const otp = document.getElementById('auth-otp').value;

        if (otp.length !== 6) {
            Toast.show("Please enter the 6-digit code", "error");
            return;
        }

        const btn = document.getElementById('btn-verify');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        btn.disabled = true;

        try {
            const res = await API.call('verifyOTP', { email, otp });

            if (res.success) {
                if (res.exists) {
                    // SCENARIO A: Existing User -> Login
                    this.saveSession(res.user);
                    this.closeModal('login-modal');
                    Toast.show(`Welcome back, ${res.user.name}`, "success");
                } else {
                    // SCENARIO B: New User -> Show Registration Form
                    this.switchStep('register-step');
                    // Pre-fill email
                    document.getElementById('reg-email').value = email;
                }
            } else {
                Toast.show(res.error || "Invalid Code", "error");
            }
        } catch (e) {
            Toast.show("Network Error", "error");
        } finally {
            btn.innerHTML = 'Verify & Continue';
            btn.disabled = false;
        }
    },

    // 4. Register New User
    async register() {
        const data = {
            email: document.getElementById('reg-email').value,
            name: document.getElementById('reg-name').value,
            phone: document.getElementById('reg-phone').value,
            bloodType: document.getElementById('reg-blood').value,
            location: document.getElementById('reg-location').value,
            role: document.getElementById('reg-role').value
        };

        if (!data.name || !data.phone || !data.location) {
            Toast.show("Please fill all required fields", "error");
            return;
        }

        const btn = document.getElementById('btn-register');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
        btn.disabled = true;

        try {
            const res = await API.call('register', data);

            if (res.success) {
                this.saveSession(res.user);
                this.closeModal('login-modal');
                Toast.show("Account created successfully!", "success");
            } else {
                Toast.show(res.error, "error");
            }
        } catch (e) {
            Toast.show("Network Error", "error");
        } finally {
            btn.innerHTML = 'Create Account';
            btn.disabled = false;
        }
    },

    // 5. Save Session & Handle Redirect
    saveSession(user) {
        // Generate expiry time (24 hours from now)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        const session = { ...user, expiresAt };
        localStorage.setItem('bc_session', JSON.stringify(session));
        
        if (window.AppState) window.AppState.currentUser = session;
        
        this.onLoginSuccess(session);
    },

    // 6. Post-Login Actions (Redirect based on role/app)
    onLoginSuccess(user) {
        // Hide Login Button
        if(document.getElementById('auth-buttons')) {
            document.getElementById('auth-buttons').classList.add('hidden');
            document.getElementById('user-menu').classList.remove('hidden'); 
            document.getElementById('user-menu').classList.add('flex');
            if(document.getElementById('user-name-display')) document.getElementById('user-name-display').innerText = user.name;
            if(document.getElementById('user-role-display')) document.getElementById('user-role-display').innerText = user.role;
        }

        // Redirect Logic
        if (window.location.pathname.includes('admin.html')) {
            // Admin Dashboard specific setup
            if(window.App) App.refreshData(); 
        } else {
            // Public App routing
            if(window.App) {
                if (user.role === 'donor') {
                    window.App.setupDonorDashboard();
                    window.App.router('donor');
                } else if (user.role === 'hospital') {
                    window.App.loadHospitalData();
                    window.App.router('hospital');
                } else if (user.role === 'superadmin') {
                    // If a superadmin logs in to the public app, maybe redirect to admin?
                    // For now, just stay on landing or dashboard
                }
            }
        }
    },

    logout() {
        localStorage.removeItem('bc_session');
        if (window.AppState) window.AppState.currentUser = null;
        
        // UI Reset
        if(document.getElementById('auth-buttons')) {
            document.getElementById('auth-buttons').classList.remove('hidden');
            document.getElementById('user-menu').classList.add('hidden');
            document.getElementById('user-menu').classList.remove('flex');
        }

        Toast.show("Logged out successfully", "info");
        
        // Redirect to Home
        if (window.location.pathname.includes('admin.html')) {
            window.location.href = 'index.html';
        } else if (window.App) {
            window.App.router('landing');
        }
    },

    // UI Helpers
    openModal(id) { document.getElementById(id).classList.remove('hidden'); },
    closeModal(id) { document.getElementById(id).classList.add('hidden'); },
    resetModal() {
        this.switchStep('email-step');
        document.getElementById('auth-email').value = '';
        document.getElementById('auth-otp').value = '';
        document.getElementById('reg-name').value = '';
        document.getElementById('reg-phone').value = '';
        document.getElementById('reg-location').value = '';
    },
    switchStep(stepId) {
        // Hide all steps
        ['email-step', 'otp-step', 'register-step'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.add('hidden-section');
        });
        // Show target
        const target = document.getElementById(stepId);
        if(target) target.classList.remove('hidden-section');
    }
};
