// Check authentication status and update buttons
function updateAuthButton() {
    fetch('/api/check-auth')
        .then(response => response.json())
        .then(data => {
            // Desktop elements
            const loginBtn = document.querySelector('.nav-btn');
            const signupLink = document.getElementById('ProfileSign');

            // Mobile elements
            const accountNavItem = document.querySelector('.mobile-nav-item:last-child');
            const accountSpan = accountNavItem?.querySelector('span');
            const accountIcon = accountNavItem?.querySelector('i');

            if (data.isAuthenticated) {
                // Desktop
                if (loginBtn) {
                    loginBtn.innerHTML = 'Log Out';
                    loginBtn.href = '/logout';
                }
                if (signupLink) {
                    signupLink.innerHTML = 'Dashboard';
                    signupLink.href = '/dashboard';
                }

                // Mobile
                if (accountSpan) accountSpan.innerHTML = 'Dashboard';
                if (accountNavItem) accountNavItem.href = '/dashboard';
                if (accountIcon) {
                    accountIcon.classList.remove('bi-person');
                    accountIcon.classList.add('bi-speedometer2');
                }
            } else {
                // Desktop
                if (loginBtn) {
                    loginBtn.innerHTML = 'Log In';
                    loginBtn.href = '/Login';
                }
                if (signupLink) {
                    signupLink.innerHTML = 'Sign Up';
                    signupLink.href = '/register';
                }

                // Mobile
                if (accountSpan) accountSpan.innerHTML = 'Account';
                if (accountNavItem) accountNavItem.href = '/Login';
                if (accountIcon) {
                    accountIcon.classList.remove('bi-speedometer2');
                    accountIcon.classList.add('bi-person');
                }
            }
        })
        .catch(error => console.error('Error checking auth status:', error));
}

// Run on page load
document.addEventListener('DOMContentLoaded', updateAuthButton);

// Mobile Nav Helper
document.addEventListener('DOMContentLoaded', () => {
    const burger = document.getElementById('burger');
    const navbar = document.getElementById('navbar');
    if (burger && navbar) {
        burger.addEventListener('click', () => {
            navbar.classList.toggle('nav-open');
        });
    }
});
