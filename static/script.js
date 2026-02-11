function _copy() {
    const email = "archiemac07@outlook.com";
    navigator.clipboard.writeText(email).then(() => {
        alert("Email address copied to clipboard!");
    }).catch(err => {
        console.error("Failed to copy email: ", err);
    });
}