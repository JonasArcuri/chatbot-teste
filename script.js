document.addEventListener("scroll", () => {
    document.querySelectorAll("section").forEach((section) => {
        if (section.getBoundingClientRect().top < window.innerHeight - 50) {
            section.classList.add("show");
        }
    });
});
