/**
 * Mobile Window Switcher Module
 * Phase 5 Fix: Switch between hemispherical and linear projections on mobile
 */

export class MobileWindowSwitcher {
    constructor() {
        this.currentMode = 'hemispherical'; // Default to hemispherical
        this.init();
    }

    init() {
        // Show switcher only on mobile (max-width: 480px)
        this.checkScreenSize();
        window.addEventListener('resize', () => this.checkScreenSize());

        // Get switcher buttons
        const hemiBtn = document.getElementById('mobile-hemi-btn');
        const linearBtn = document.getElementById('mobile-linear-btn');

        if (!hemiBtn || !linearBtn) {
            console.warn('Mobile window switcher buttons not found');
            return;
        }

        // Simplified Event Handling: Use standard 'click' which works on mobile too
        // This avoids conflicts with touchstart/touchend and browser gestures

        hemiBtn.onclick = (e) => {
            if (e) e.stopPropagation();
            this.switchToHemispherical();
        };

        linearBtn.onclick = (e) => {
            if (e) e.stopPropagation();
            this.switchToLinear();
        };

        console.log('Mobile window switcher initialized');
    }

    checkScreenSize() {
        const switcher = document.querySelector('.mobile-window-switcher');
        if (!switcher) return;

        // Show switcher only on mobile devices (<= 480px)
        if (window.innerWidth <= 480) {
            switcher.style.display = 'flex';
        } else {
            switcher.style.display = 'none';
        }
    }

    switchToHemispherical() {
        console.log('switchToHemispherical called, current mode:', this.currentMode);
        if (this.currentMode === 'hemispherical') return;

        this.currentMode = 'hemispherical';

        // Hide linear windows
        const linear3D = document.getElementById('linear3D-window');
        const linear2D = document.getElementById('linear2D-window');
        if (linear3D) {
            linear3D.style.display = 'none';
            console.log('Hid linear3D-window');
        }
        if (linear2D) {
            linear2D.style.display = 'none';
            console.log('Hid linear2D-window');
        }

        // Show hemispherical windows
        const hemi3D = document.getElementById('hemi3D-window');
        const hemi2D = document.getElementById('hemi2D-window');
        if (hemi3D) {
            hemi3D.style.display = 'flex';
            console.log('Showed hemi3D-window');
        }
        if (hemi2D) {
            hemi2D.style.display = 'flex';
            console.log('Showed hemi2D-window');
        }

        // Update button states
        const hemiBtn = document.getElementById('mobile-hemi-btn');
        const linearBtn = document.getElementById('mobile-linear-btn');
        if (hemiBtn) hemiBtn.classList.add('active');
        if (linearBtn) linearBtn.classList.remove('active');

        // Force a render
        if (window.renderer) {
            console.log('Forcing render after switch');
            window.renderer.onWindowResize();
        }

        console.log('Switched to hemispherical projection');

        // Critical Fix: Force resize update for newly visible windows
        if (window.renderer) {
            // Wait for layout reflow
            setTimeout(() => {
                console.log('Forcing renderer resize');
                window.renderer.onWindowResize();
            }, 50);
        }
    }

    switchToLinear() {
        console.log('switchToLinear called, current mode:', this.currentMode);
        if (this.currentMode === 'linear') return;

        this.currentMode = 'linear';

        // Hide hemispherical windows
        const hemi3D = document.getElementById('hemi3D-window');
        const hemi2D = document.getElementById('hemi2D-window');
        if (hemi3D) {
            hemi3D.style.display = 'none';
            console.log('Hid hemi3D-window');
        }
        if (hemi2D) {
            hemi2D.style.display = 'none';
            console.log('Hid hemi2D-window');
        }

        // Show linear windows
        const linear3D = document.getElementById('linear3D-window');
        const linear2D = document.getElementById('linear2D-window');
        if (linear3D) {
            linear3D.style.display = 'flex';
            console.log('Showed linear3D-window');
        }
        if (linear2D) {
            linear2D.style.display = 'flex';
            console.log('Showed linear2D-window');
        }

        // Update button states
        const hemiBtn = document.getElementById('mobile-hemi-btn');
        const linearBtn = document.getElementById('mobile-linear-btn');
        if (hemiBtn) hemiBtn.classList.remove('active');
        if (linearBtn) linearBtn.classList.add('active');

        // Force a render
        if (window.renderer) {
            console.log('Forcing render after switch');
            window.renderer.onWindowResize();
        }

        console.log('Switched to linear projection');

        // Critical Fix: Force resize update for newly visible windows
        if (window.renderer) {
            // Wait for layout reflow
            setTimeout(() => {
                console.log('Forcing renderer resize');
                window.renderer.onWindowResize();
            }, 50);
        }
    }
}
