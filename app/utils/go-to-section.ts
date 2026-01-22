export const goToSection = (item: LANDING_NAV_LINK) => {
  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
};
