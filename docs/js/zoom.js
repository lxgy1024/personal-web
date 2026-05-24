document.addEventListener('DOMContentLoaded', () => {
  const images = document.querySelectorAll('.thought-images img');
  if (images.length > 0 && typeof mediumZoom !== 'undefined') {
    mediumZoom(images, {
      background: 'rgba(0,0,0,0.7)',
      margin: 32,
    });
  }
});
