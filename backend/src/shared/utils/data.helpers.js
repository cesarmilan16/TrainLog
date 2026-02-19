function parsePositiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isSqliteUniqueError(error) {
  return error && error.code === 'SQLITE_CONSTRAINT_UNIQUE';
}

module.exports = {
  parsePositiveInt,
  isSqliteUniqueError
};
