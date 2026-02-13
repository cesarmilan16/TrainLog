function authorize(...allowedRoles) {
    return (req, res, next) => {
        const useRole = req.user.role;

        if (!allowedRoles.includes(useRole)) {
            return res.status(403).json({
                message: 'No tienes permisos'
            });
        };

        next();
    };
}

module.exports = authorize;