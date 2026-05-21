export async function rotateFile(file: File, degrees: 0 | 90 | 180 | 270): Promise<File> {
  if (degrees === 0) return file

  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()

    const swap = degrees === 90 || degrees === 270
    const canvas = document.createElement('canvas')
    canvas.width = swap ? img.naturalHeight : img.naturalWidth
    canvas.height = swap ? img.naturalWidth : img.naturalHeight

    const ctx = canvas.getContext('2d')!
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((degrees * Math.PI) / 180)
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)

    return await new Promise<File>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('canvas.toBlob failed')); return }
        resolve(new File([blob], file.name, { type: file.type }))
      }, file.type)
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
