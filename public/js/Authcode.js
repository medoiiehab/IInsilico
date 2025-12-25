 // Check authentication status and update button
    function updateAuthButton() {
        fetch('/api/check-auth')
            .then(response => response.json())
            .then(data => {
                const loginBtn = document.querySelector('.navbar .btn-primary');
                const signupLink = document.getElementById('ProfileSign');

                if (data.isAuthenticated) {
                    loginBtn.innerHTML = '<i class="fa fa-sign-out-alt me-2"></i>Log Out';
                    loginBtn.href = '/logout';
                    signupLink.innerHTML = 'Profile';
                    signupLink.href = '/dashboard'; 
                } else {
                    loginBtn.innerHTML = '<i class="fa fa-arrow-right me-2"></i>Log In';
                    loginBtn.href = '/Login';
                     signupLink.innerHTML = 'SignUp'; 
                    signupLink.href = 'register.html';
                }
            })
            .catch(error => console.error('Error checking auth status:', error));
    }

    // Run on page load
    document.addEventListener('DOMContentLoaded', updateAuthButton);


            // Mobile nav
    const burger = document.getElementById('burger');
    const navbar = document.getElementById('navbar');
    burger?.addEventListener('click', ()=>{
      navbar.classList.toggle('nav-open');
    });

    // Back to top
    const btt = document.getElementById('backToTop');
    btt.addEventListener('click', ()=> window.scrollTo({top:0, behavior:'smooth'}));
