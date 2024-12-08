const template = {
    successResponse(data) {
      return {
        success: true,
        data: data
      }
    },
    failedResponse(message) {
      return {
        success: false,
        message: message
      }
    }
  }
  
  module.exports = template