const CONFIG = {
    // REPLACE THIS WITH YOUR GOOGLE APPS SCRIPT WEB APP URL
    SCRIPT_URL: "https://script.google.com/macros/s/AKfycby_6Bf3VfWXX_7eHTJ7QxkK18GLCVtwwJx-0mmqqwGFa8aM7uSzJmNeP5vopnnpPPdy/exec", 
    center: [27.7172, 85.3240], // Default center
    zoom: 13
};

const API = {
    async call(action, data = {}) {
        const body = { action, ...data };
        
        // Add token if user is logged in (handled by individual apps via State.currentUser)
        if (window.AppState && window.AppState.currentUser) {
            body.userId = window.AppState.currentUser.id;
            body.token = window.AppState.currentUser.token;
        }

        try {
            const res = await fetch(CONFIG.SCRIPT_URL, { 
                method: 'POST', 
                body: JSON.stringify(body) 
            });
            return await res.json();
        } catch (e) {
            console.error("API Error", e);
            return { success: false, error: "Network Error" };
        }
    }
};

const Toast = {
    show(msg, type = 'info') {
        // Check if element exists (only in Admin Dashboard)
        let toast = document.getElementById('toast');
        if(!toast) {
            // Create simple toast for Index if not present
            toast = document.createElement('div');
            toast.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#1e293b; color:white; padding:12px 24px; border-radius:50px; z-index:9999; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); transition:all 0.3s; opacity:0; pointer-events:none;";
            document.body.appendChild(toast);
        }
        
        const icon = document.getElementById('toast-icon');
        const text = document.getElementById('toast-msg') || toast;

        if(text.innerText !== undefined) text.innerText = msg;
        else toast.innerText = msg;

        if(icon) {
            icon.className = type === 'success' ? 'fas fa-check-circle text-green-400' : 
                            type === 'error' ? 'fas fa-exclamation-circle text-red-400' : 'fas fa-info-circle text-blue-400';
        }
const API = {
    async call(action, data = {}) {
        const body = { action, ...data };
        
        // Inject User ID and Token if logged in (works for both index and admin)
        const state = window.AppState || window.AdminState;
        if (state && state.currentUser) {
            body.userId = state.currentUser.id;
            body.token = state.currentUser.token;
        }

        try {
            const res = await fetch(CONFIG.SCRIPT_URL, { 
                method: 'POST', 
                body: JSON.stringify(body) 
            });
            return await res.json();
        } catch (e) {
            console.error("API Error", e);
            return { success: false, error: "Network Error" };
        }
    }
};
        toast.classList.remove('opacity-0', 'translate-y-10');
        setTimeout(() => { toast.classList.add('opacity-0', 'translate-y-10'); }, 3000);
    }
};
