const {initializeTestEnvironment, assertSucceeds, assertFails} = require('@firebase/rules-unit-testing');
const {deleteDoc, setDoc, collection, getDoc, addDoc, doc, deleteField} = require("firebase/firestore");
const fs = require('fs');

describe('Firestore Security Rules - Expenses Collection', () => {
  const COLLECTION = 'expenses';
  const OWNER_UID = 'A1d58UnhHDKR0EG2YNtQ5Jl2JvGM';
  const OTHER_USER_UID = '7IItpulsKXzD0CEJMrtAJvuryKW8';
  const PUBLIC_KEY = 'public';
  const DEFAULT_DATA = {created: new Date(), modified: new Date(), createdBy: OWNER_UID, acl: {}};

  let testEnv;
  let ownerFirestore, otherUserFirestore, unauthenticatedFirestore;

  beforeAll(async () => {
    // Initialize the testing environment
    testEnv = await initializeTestEnvironment({
      projectId: 'paycheck-to-paycheck-b023c',
      firestore: {
        rules: fs.readFileSync('firestore.rules', 'utf8')
      }
    });

    // Initialize Firestore instances for different users
    ownerFirestore = testEnv.authenticatedContext(OWNER_UID).firestore();
    otherUserFirestore = testEnv.authenticatedContext(OTHER_USER_UID).firestore();
    unauthenticatedFirestore = testEnv.unauthenticatedContext().firestore();
  });

  afterEach(async () => {
    // Clean up the test environment
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  async function createDoc(data) {
    const expenseCollectionRef = collection(ownerFirestore, COLLECTION);
    const docRef = doc(expenseCollectionRef);
    await setDoc(docRef, {...DEFAULT_DATA, ...(data || {})});

    return docRef.id;
  }

  describe('Create Tests', () => {
    test('Authenticated user should be able to create a document', async () => {
      // when
      const expenseCollectionRef = collection(ownerFirestore, COLLECTION);

      // then
      await assertSucceeds(addDoc(expenseCollectionRef, {...DEFAULT_DATA}));
    });

    test('Unauthenticated user should not be able to create a document', async () => {
      // when
      const expenseCollectionRef = collection(unauthenticatedFirestore, COLLECTION);

      // then
      await assertFails(addDoc(expenseCollectionRef, {...DEFAULT_DATA}));
    });
  });

  describe('Owner Tests', () => {
    test('Owner should be able to read a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertSucceeds(getDoc(docRef));
    });

    test('Owner should be able to update a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertSucceeds(setDoc(docRef, {modified: new Date()}, {merge: true}));
    });

    test('Owner should be able to delete a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertSucceeds(deleteDoc(docRef));
    });
  });

  describe('Editor Tests', () => {
    test('Editor should be able to read a document', async () => {
      // given
      const id = await createDoc({acl: {[OTHER_USER_UID]: 'editor'}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertSucceeds(getDoc(docRef));
    });

    test('Editor should be able to update a document', async () => {
      // given
      const id = await createDoc({acl: {[OTHER_USER_UID]: 'editor'}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertSucceeds(setDoc(docRef, {modified: new Date()}, {merge: true}));
    });

    test('Editor should not be able to delete a document', async () => {
      // given
      const id = await createDoc({acl: {[OTHER_USER_UID]: 'editor'}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(deleteDoc(docRef));
    });
  });

  describe('Viewer Tests', () => {
    test('Viewer should be able to read a document', async () => {
      // given
      const id = await createDoc({acl: {[OTHER_USER_UID]: 'viewer'}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertSucceeds(getDoc(docRef));
    });

    test('Viewer should not be able to update a document', async () => {
      // given
      const id = await createDoc({acl: {[OTHER_USER_UID]: 'viewer'}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {foo: 'bar'}, {merge: true}));
    });

    test('Viewer should not be able to delete a document', async () => {
      // given
      const id = await createDoc({acl: {[OTHER_USER_UID]: 'viewer'}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(deleteDoc(docRef));
    });
  });

  describe('Unauthenticated Tests', () => {
    test('Unauthenticated user should not be able to read a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(unauthenticatedFirestore, COLLECTION, id);

      // then
      await assertFails(getDoc(docRef));
    });

    test('Unauthenticated user should not be able to update a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(unauthenticatedFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {foo: 'bar'}, {merge: true}));
    });

    test('Unauthenticated user should not be able to delete a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(unauthenticatedFirestore, COLLECTION, id);

      // then
      await assertFails(deleteDoc(docRef));
    });
  });

  describe('Public Editor Tests', () => {
    test('Public editor should be able to read a document', async () => {
      // given
      const id = await createDoc({acl: {[PUBLIC_KEY]: 'editor'}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertSucceeds(getDoc(docRef));
    });

    test('Public editor should be able to update a document', async () => {
      // given
      const id = await createDoc({acl: {[PUBLIC_KEY]: 'editor'}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertSucceeds(setDoc(docRef, {modified: new Date()}, {merge: true}));
    });

    test('Public editor should not be able to delete a document', async () => {
      // given
      const id = await createDoc({acl: {[PUBLIC_KEY]: 'editor'}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(deleteDoc(docRef));
    });
  });

  describe('Public Viewer Tests', () => {
    test('Public viewer should be able to read a document', async () => {
      // given
      const id = await createDoc({acl: {[PUBLIC_KEY]: 'viewer'}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertSucceeds(getDoc(docRef));
    });

    test('Public viewer should not be able to update a document', async () => {
      // given
      const id = await createDoc({acl: {[PUBLIC_KEY]: 'viewer'}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {foo: 'bar'}, {merge: true}));
    });

    test('Public viewer should not be able to delete a document', async () => {
      // given
      const id = await createDoc({acl: {[PUBLIC_KEY]: 'viewer'}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(deleteDoc(docRef));
    });
  });

  describe('Not in ACL Tests', () => {
    test('User not in ACL should not be able to read a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(getDoc(docRef));
    });

    test('User not in ACL should not be able to update a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {foo: 'bar'}, {merge: true}));
    });

    test('User not in ACL should not be able to delete a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(deleteDoc(docRef));
    });
  });

  describe('Owner Restrictions', () => {
    test('A user should not be able to change the owner of a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {createdBy: OTHER_USER_UID}, {merge: true}));
    });

    test('A document should not be created if request.resource.data.createdBy == null', async () => {
      // when
      const expenseCollectionRef = collection(ownerFirestore, COLLECTION);

      // then
      await assertFails(addDoc(expenseCollectionRef, {created: new Date(), modified: new Date(), acl: {}}));
    });
  });

  describe('Create Date Restrictions', () => {
    test('A user should not be able to change the created date of a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {created: new Date()}));
    });

    test('A user should not be able to remove the created date of a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {created: deleteField()}, {merge: true}));
    });

    test('A document should not be created if request.resource.data.created is == null', async () => {
      // when
      const expenseCollectionRef = collection(ownerFirestore, COLLECTION);
      const data = {...DEFAULT_DATA, created: null};

      // then
      await assertFails(addDoc(expenseCollectionRef, data));
    });
  });

  describe('Modified Date Restrictions', () => {
    test('A user should be able to change the modified date of a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertSucceeds(setDoc(docRef, {modified: new Date()}));
    });

    test('A user should not be able to remove the modified date of a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {modified: deleteField()}, {merge: true}));
    });

    test('A user should not be able to update a document without changing the modified date', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {data: []}));
    })

    test('A document should not be created if request.resource.data.modified == null', async () => {
      // when
      const expenseCollectionRef = collection(ownerFirestore, COLLECTION);
      const data = {...DEFAULT_DATA, modified: null};

      // then
      await assertFails(addDoc(expenseCollectionRef, data));
    });
  });

  describe('ACL Restrictions', () => {
    test('A user should not be able to set acl to null', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {acl: null}, {merge: true}));
    });

    test('A document should not be created if request.resource.data.acl == null', async () => {
      // when
      const expenseCollectionRef = collection(ownerFirestore, COLLECTION);
      const data = {...DEFAULT_DATA, acl: null};

      // then
      await assertFails(addDoc(expenseCollectionRef, data));
    });

    test('A user should be able to update the acl of a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertSucceeds(setDoc(docRef, {acl: {[OTHER_USER_UID]: 'editor'}, modified: new Date()}, {merge: true}));
      await assertSucceeds(setDoc(docRef, {acl: {[PUBLIC_KEY]: 'viewer'}, modified: new Date()}, {merge: true}));

      const data = (await getDoc(docRef)).data();
      expect(data.acl).toEqual({[OTHER_USER_UID]: 'editor', [PUBLIC_KEY]: 'viewer'});
    });

    test('A user should be able to remove acl from a document', async () => {
      // given
      const id = await createDoc({acl: {[OTHER_USER_UID]: 'editor'}});

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertSucceeds(setDoc(docRef, {
        acl: {[OTHER_USER_UID]: deleteField()},
        modified: new Date()
      }, {merge: true}));

      const data = (await getDoc(docRef)).data();
      expect(data.acl).toEqual({});
    });
  });

  describe('Data Restrictions', () => {
    test('A user should not be able to add a field not in the allow list', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {foo: 'bar'}, {merge: true}));
    });
  });
});
