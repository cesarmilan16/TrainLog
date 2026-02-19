function handleResult(res, result, onSuccess, successStatus = 200) {
  if (result && result.error) {
    return res.status(result.status ?? 400).json({ message: result.error });
  }

  const payload = typeof onSuccess === 'function' ? onSuccess(result) : onSuccess;
  return res.status(successStatus).json(payload);
}

module.exports = { handleResult };
