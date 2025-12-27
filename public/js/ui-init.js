
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initMobileNav();
    applyGlassEffects();
});

function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('glass');
            navbar.style.top = '10px';
        } else {
            if (window.innerWidth > 991) {
                navbar.classList.remove('glass');
                navbar.style.top = '20px';
            }
        }
    });
}

function initMobileNav() {
    // Handling active states based on current page
    const currentPath = window.location.pathname;
    const items = document.querySelectorAll('.mobile-nav-item, .nav-links-desktop a');
    
    items.forEach(item => {
        const href = item.getAttribute('href');
        if (href && (currentPath.endsWith(href) || (currentPath === '/' && href === 'index.html'))) {
            item.classList.add('active');
        }
    });

    // Mobile burger toggle for more links if needed
    const burger = document.getElementById('burger');
    const navLinks = document.getElementById('navLinks');
    if (burger && navLinks) {
        burger.addEventListener('click', () => {
            document.body.classList.toggle('nav-open');
        });
    }
}

function applyGlassEffects() {
    const cards = document.querySelectorAll('.card, .stat, .fcol');
    cards.forEach(card => {
        card.classList.add('glass');
        card.classList.add('animate-up');
    });
}

// Function to inject Navbar/Footer if missing or to unify them
function unifyUI() {
    const navbarHTML = `
    <nav class="navbar-custom glass" id="navbar">
        <a class="brand" href="index.html">
            <img src="img/1000472452-removebg-preview.png" alt="IInsilico logo" />
        </a>
        <div class="nav-links-desktop">
            <a href="index.html">Home</a>
            <a href="service.html">Services</a>
            <a href="about.html">About</a>
            <a href="Login.html">Login</a>
            <a href="register.html" class="nav-btn">Sign Up</a>
        </div>
        <button class="burger" id="burger" style="display:none">☰</button>
    </nav>

    <div class="mobile-nav glass">
        <a href="index.html" class="mobile-nav-item">
            <i class="bi bi-house-door"></i>
            <span>Home</span>
        </a>
        <a href="service.html" class="mobile-nav-item">
            <i class="bi bi-grid"></i>
            <span>Services</span>
        </a>
        <a href="about.html" class="mobile-nav-item">
            <i class="bi bi-info-circle"></i>
            <span>About</span>
        </a>
        <a href="Login.html" class="mobile-nav-item">
            <i class="bi bi-person"></i>
            <span>Account</span>
        </a>
    </div>
    `;

    // Only inject if a placeholder or body exists
    if (!document.querySelector('.navbar-custom')) {
        const oldNav = document.querySelector('.navbar') || document.querySelector('.navbar-light');
        if (oldNav) {
            oldNav.outerHTML = navbarHTML;
        } else {
            document.body.insertAdjacentHTML('afterbegin', navbarHTML);
        }
    }
}

// Export for use
window.unifyUI = unifyUI;
