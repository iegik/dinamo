// Dependencies
var restful = require('node-restful'),
    mongoose = restful.mongoose,

    // Schema
    productSchema = new mongoose.Schema({
        name: String,
        sku: String,
        price: Number
    });

// Return model
module.exports = restful.model('Products', productSchema)
