<script>
document.addEventListener('DOMContentLoaded', function() {
    const textBlock = document.querySelector('.text-block');
    const div1 = document.querySelector('.div1');

    function adjustLayout() {
        // Adjust text alignment based on screen size
        if (window.innerWidth <= 768) {
            textBlock.style.textAlign = 'center';
        } else {
            textBlock.style.textAlign = 'left';
        }

        // Add margin-left for div1 dynamically if window is larger than 768px
        if (window.innerWidth > 768) {
            div1.style.marginLeft = '20px';
        } else {
            div1.style.marginLeft = '10px'; // Optional: Adjust margin for smaller screens, if needed
        }
    }

    // Add event listener to resize window
    window.addEventListener('resize', adjustLayout);

    // Initial call on page load
    adjustLayout();
});
</script>
