document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
  
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
  
      // Add submission date
      const now = new Date();
      document.getElementById('submissionDate').value = now.toISOString();
  
      // Add IP address
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        document.getElementById('ipAddress').value = ipData.ip;
      } catch (error) {
        console.error('Error fetching IP:', error);
        errorMessage.style.display = 'block';
        return;
      }
  
      // Submit the form
      const formData = new FormData(form);
      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new URLSearchParams(formData),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
  
        if (response.ok) {
          form.style.display = 'none';
          successMessage.style.display = 'block';
        } else {
          throw new Error('Submission failed');
        }
      } catch (error) {
        console.error('Form submission error:', error);
        errorMessage.style.display = 'block';
      }
    });
  });
  