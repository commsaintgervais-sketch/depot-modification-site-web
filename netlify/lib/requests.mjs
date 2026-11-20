// Keep the row locked while removing attachments. A failed storage operation leaves
// the request available for a retry; deleting an already absent blob is idempotent.
export async function deleteRequest(db, files, id) {
 const client=await db.pool.connect();
 try {
  await client.query('BEGIN');
  const {rows:[row]}=await client.query('SELECT files FROM requests WHERE id=$1 FOR UPDATE',[id]);
  if(!row){await client.query('COMMIT');return false;}
  for(const file of row.files) {
   if(typeof file.key!=='string'||!file.key.startsWith(id+'/')) throw new Error('Clé de pièce jointe invalide.');
   await files.delete(file.key);
  }
  await client.query('DELETE FROM requests WHERE id=$1',[id]);
  await client.query('COMMIT');
  return true;
 } catch(error) {await client.query('ROLLBACK');throw error;}
 finally {client.release();}
}
