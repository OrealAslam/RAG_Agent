import axios from 'axios';


const api = axios.create({
    baseURL: 'http://localhost:8000', // Replace with your Express server URL
    // headers: {
    //     'Content-Type': 'multipart/form-data',
    // },
    allowAbsoluteUrls: true, // Allow absolute URLs for requests
    beforeRedirect: (config) => {
        // This function is called before a redirect occurs
        // You can modify the config object here if needed
        console.log('Redirecting to:', config);
    },
    maxRateLimit: 1, // Limit the number of requests per second to 1
});

export default api;