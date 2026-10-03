const menuButton = document.querySelector('.menu-button');
const mobileNavigation = document.querySelector('#mobile-nav');

menuButton?.addEventListener('click', () => {
  const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isExpanded));
  mobileNavigation.hidden = isExpanded;
});

mobileNavigation?.addEventListener('click', (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    menuButton?.setAttribute('aria-expanded', 'false');
    mobileNavigation.hidden = true;
  }
});
