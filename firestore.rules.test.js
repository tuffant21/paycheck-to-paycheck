const {initializeTestEnvironment, assertSucceeds, assertFails} = require('@firebase/rules-unit-testing');
const {
  getDocs,
  orderBy,
  where,
  limit,
  or,
  query,
  deleteDoc,
  setDoc,
  collection,
  getDoc,
  doc,
  deleteField,
  arrayUnion,
  arrayRemove
} = require("firebase/firestore");
const fs = require('fs');

describe('Firestore Security Rules - Expenses Collection', () => {
  const COLLECTION = 'expenses';
  const owner = { id: 'A1d58UnhHDKR0EG2YNtQ5Jl2JvGM', email: 'owner@paycheck-to-paycheck.com' };
  const otherUser = { id: '7IItpulsKXzD0CEJMrtAJvuryKW8', email: 'other-user@paycheck-to-paycheck.com' };

  const DEFAULT_DATA = {
    created: new Date(),
    modified: new Date(),
    createdBy: owner.id,
    title: 'New Document',
    headers: [],
    data: [],
    acl: {
      editors: [],
      viewers: []
    }
  };

  let testEnv;
  let ownerFirestore, otherUserFirestore, unauthenticatedFirestore;

  beforeAll(async () => {
    // Initialize the testing environment
    testEnv = await initializeTestEnvironment({
      projectId: 'paycheck-to-paycheck-b023c',
      firestore: {
        rules: fs.readFileSync('firestore.rules', 'utf8'),
        host: 'localhost',
        port: 8080
      }
    });

    // Initialize Firestore instances for different users
    ownerFirestore = testEnv.authenticatedContext(owner.id, { email: owner.email }).firestore();
    otherUserFirestore = testEnv.authenticatedContext(otherUser.id, { email: otherUser.email }).firestore();
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
    const mergedAcl = {editors: [], viewers: [], ...data?.acl};
    await setDoc(docRef, {id: docRef.id, ...DEFAULT_DATA, ...(data || {}), ...{acl: mergedAcl}});

    return docRef.id;
  }

  describe('Create Tests', () => {
    test('Authenticated user should be able to create a document', async () => {
      // when
      const expenseCollectionRef = collection(ownerFirestore, COLLECTION);
      const docRef = doc(expenseCollectionRef);

      // then
      await assertSucceeds(setDoc(docRef, {id: docRef.id, ...DEFAULT_DATA}));
    });

    test('Unauthenticated user should not be able to create a document', async () => {
      // when
      const expenseCollectionRef = collection(unauthenticatedFirestore, COLLECTION);
      const docRef = doc(expenseCollectionRef);

      // then
      await assertFails(setDoc(docRef, {id: docRef.id, ...DEFAULT_DATA}));
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

    test('Owner should be able to list documents created by them', async () => {
      // given
      await createDoc();
      await createDoc();
      await createDoc();
      await createDoc();
      await createDoc();

      // when
      const expenseCollectionRef = collection(ownerFirestore, COLLECTION);

      // then
      const q = query(
        expenseCollectionRef,
        where('createdBy', '==', owner.id),
        orderBy('created', 'desc'),
        limit(10)
      );
      const data = await assertSucceeds(getDocs(q));
      expect(data.size).toBe(5);
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

    test('Owner should be able to add users to the acl', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertSucceeds(setDoc(docRef, {
        acl: {
          editors: arrayUnion(otherUser.email)
        },
        modified: new Date()
      }, {merge: true}));

      const data = (await getDoc(docRef)).data();
      expect(data.acl.editors).toEqual([otherUser.email]);
    });

    test('Owner should be able to remove acl from a document', async () => {
      // given
      const id = await createDoc({acl: {editors: [otherUser.email]}});

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertSucceeds(setDoc(docRef, {
        acl: {
          editors: arrayRemove(otherUser.email),
        },
        modified: new Date()
      }, {merge: true}));

      const data = (await getDoc(docRef)).data();
      expect(data.acl.editors).toEqual([]);
    });
  });

  describe('Editor Tests', () => {
    test('Editor should be able to read a document', async () => {
      // given
      const id = await createDoc({acl: {editors: [otherUser.email]}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertSucceeds(getDoc(docRef));
    });

    test('Editor should be able to list documents they are editors on', async () => {
      // given
      await createDoc({acl: {editors: [otherUser.email]}});
      await createDoc({acl: {editors: [otherUser.email]}});
      await createDoc({acl: {editors: [otherUser.email]}});
      await createDoc();
      await createDoc();

      // when
      const expenseCollectionRef = collection(otherUserFirestore, COLLECTION);

      // then
      const q = query(
        expenseCollectionRef,
        where('acl.editors', 'array-contains', otherUser.email),
        orderBy('created', 'desc'),
        limit(10)
      );
      const data = await assertSucceeds(getDocs(q));
      expect(data.size).toBe(3);
    });

    test('Editor should be able to update a document', async () => {
      // given
      const id = await createDoc({acl: {editors: [otherUser.email]}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertSucceeds(setDoc(docRef, {modified: new Date()}, {merge: true}));
    });

    test('Editor should not be able to delete a document', async () => {
      // given
      const id = await createDoc({acl: {editors: [otherUser.email]}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(deleteDoc(docRef));
    });

    test('Editor should be able to add users to the acl', async () => {
      // given
      const id = await createDoc({acl: {editors: [otherUser.email]}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertSucceeds(setDoc(docRef, {
        acl: {
          editors: arrayUnion('some-third-user@paycheck-to-paycheck.com')
        },
        modified: new Date()
      }, {merge: true}));

      const data = (await getDoc(docRef)).data();
      expect(data.acl.editors).toEqual([otherUser.email, 'some-third-user@paycheck-to-paycheck.com']);
    });

    test('Editor should be able to remove acl from a document', async () => {
      // given
      const id = await createDoc({acl: {editors: [otherUser.email, 'some-third-user@paycheck-to-paycheck.com']}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertSucceeds(setDoc(docRef, {
        acl: {
          editors: arrayRemove('some-third-user@paycheck-to-paycheck.com'),
        },
        modified: new Date()
      }, {merge: true}));

      const data = (await getDoc(docRef)).data();
      expect(data.acl.editors).toEqual([otherUser.email]);
    });
  });

  describe('Viewer Tests', () => {
    test('Viewer should be able to read a document', async () => {
      // given
      const id = await createDoc({acl: {viewers: [otherUser.email]}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertSucceeds(getDoc(docRef));
    });

    test('Viewer should be able to list documents they are viewers on', async () => {
      // given
      await createDoc({acl: {viewers: [otherUser.email]}});
      await createDoc({acl: {viewers: [otherUser.email]}});
      await createDoc({acl: {viewers: [otherUser.email]}});
      await createDoc({acl: {viewers: [otherUser.email]}});
      await createDoc({acl: {viewers: [otherUser.email]}});

      // when
      const expenseCollectionRef = collection(otherUserFirestore, COLLECTION);

      // then
      const q = query(
        expenseCollectionRef,
        where('acl.viewers', 'array-contains', otherUser.email),
        orderBy('created', 'desc'),
        limit(10)
      );
      const data = await assertSucceeds(getDocs(q));
      expect(data.size).toBe(5);
    });

    test('Viewer should not be able to update a document', async () => {
      // given
      const id = await createDoc({acl: {viewers: [otherUser.email]}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {modified: new Date()}, {merge: true}));
    });

    test('Viewer should not be able to delete a document', async () => {
      // given
      const id = await createDoc({acl: {viewers: [otherUser.email]}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(deleteDoc(docRef));
    });

    test('Viewer should not be able to update the acl of a document', async () => {
      // given
      const id = await createDoc({acl: {viewers: [otherUser.email]}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {
        acl: {
          editors: arrayUnion('some-third-user@paycheck-to-paycheck.com')
        },
        modified: new Date()
      }, {merge: true}));
    });

    test('Viewer should not be able to remove acl from a document', async () => {
      // given
      const id = await createDoc({acl: {viewer: [otherUser.email, 'some-third-user@paycheck-to-paycheck.com']}});

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {
        acl: {
          editors: arrayRemove('some-third-user@paycheck-to-paycheck.com'),
        },
        modified: new Date()
      }, {merge: true}));
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

    test('Unauthenticated user should not be able to list documents', async () => {
      // given
      await createDoc();

      // when
      const expenseCollectionRef = collection(unauthenticatedFirestore, COLLECTION);

      // then
      const q = query(
        expenseCollectionRef,
        where('createdBy', '==', owner.id),
        orderBy('created', 'desc'),
        limit(10)
      );
      await assertFails(getDocs(q));
    });

    test('Unauthenticated user should not be able to update a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(unauthenticatedFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {modified: new Date()}, {merge: true}));
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

  describe('Not in ACL Tests', () => {
    test('User not in ACL should not be able to read a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(getDoc(docRef));
    });

    test('User with no documents and not in any acl should receive no documents back', async () => {
      // given
      await createDoc();

      // when
      const expenseCollectionRef = collection(otherUserFirestore, COLLECTION);

      // then
      const q = query(
        expenseCollectionRef,
        or(
          where('createdBy', '==', otherUser.id),
          where('acl.editors', 'array-contains', otherUser.email),
          where('acl.viewers', 'array-contains', otherUser.email)
        ),
        orderBy('created', 'desc'),
        limit(10)
      );
      const data = await assertSucceeds(getDocs(q));
      expect(data.size).toBe(0);
    });

    test('User should not be able to query other owner documents', async () => {
      // given
      await createDoc();

      // when
      const expenseCollectionRef = collection(otherUserFirestore, COLLECTION);

      // then
      const q = query(
        expenseCollectionRef,
        or(
          where('createdBy', '==', owner.id),
          where('acl.editors', 'array-contains', owner.email),
          where('acl.viewers', 'array-contains', owner.email)
        ),
        orderBy('created', 'desc'),
        limit(10)
      );
      await assertFails(getDocs(q));
    });

    test('User not in ACL should not be able to update a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {modified: new Date()}, {merge: true}));
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
      await assertFails(setDoc(docRef, {createdBy: otherUser.id}, {merge: true}));
    });

    test('A document should not be created if request.resource.data.createdBy == null', async () => {
      // when
      const expenseCollectionRef = collection(ownerFirestore, COLLECTION);
      const docRef = doc(expenseCollectionRef);
      const data = {id: docRef.id, ...DEFAULT_DATA};
      delete data.createdBy;

      // then
      await assertFails(setDoc(docRef, data));
    });
  });

  describe('ID Restrictions', () => {
    test('A user should not be able to change the ID of a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {id: 'foo'}, {merge: true}));
    });

    test('A user should not be able to remove the ID of a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {id: deleteField()}, {merge: true}));
    });

    test('A document should not be created if request.resource.data.id == null', async () => {
      // when
      const expenseCollectionRef = collection(ownerFirestore, COLLECTION);
      const docRef = doc(expenseCollectionRef);
      const data = {...DEFAULT_DATA};

      // then
      await assertFails(setDoc(docRef, data));
    });
  });

  describe('Create Date Restrictions', () => {
    test('A user should not be able to change the created date of a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(otherUserFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {created: new Date()}, {merge: true}));
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
      const docRef = doc(expenseCollectionRef);
      const data = {id: docRef.id, ...DEFAULT_DATA};
      delete data.created;

      // then
      await assertFails(setDoc(docRef, data));
    });
  });

  describe('Modified Date Restrictions', () => {
    test('A user should be able to change the modified date of a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertSucceeds(setDoc(docRef, {modified: new Date()}, {merge: true}));
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
      await assertFails(setDoc(docRef, {data: []}, {merge: true}));
    })

    test('A document should not be created if request.resource.data.modified == null', async () => {
      // when
      const expenseCollectionRef = collection(ownerFirestore, COLLECTION);
      const docRef = doc(expenseCollectionRef);
      const data = {id: docRef.id, ...DEFAULT_DATA};
      delete data.modified;

      // then
      await assertFails(setDoc(docRef, data));
    });
  });

  describe('Title Restrictions', () => {
    test('A user should be able to update the title of a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertSucceeds(setDoc(docRef, {title: 'New Title', modified: new Date()}, {merge: true}));
    });

    test('A user should not be able to remove the title of a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {title: deleteField()}, {merge: true}));
    });

    test('A document should not be created if request.resource.data.title == null', async () => {
      // when
      const expenseCollectionRef = collection(ownerFirestore, COLLECTION);
      const docRef = doc(expenseCollectionRef);
      const data = {id: docRef.id, ...DEFAULT_DATA};
      delete data.title;

      // then
      await assertFails(setDoc(docRef, data));
    });
  });

  describe('Headers Restrictions', () => {
    test('A user should be able to update the headers of a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertSucceeds(setDoc(docRef, {headers: [{key: '', type: 'text', display: ''}], modified: new Date()}, {merge: true}));
    });

    test('A user should not be able to remove the headers of a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {headers: deleteField()}, {merge: true}));
    });

    test('A document should not be created if request.resource.data.headers == null', async () => {
      // when
      const expenseCollectionRef = collection(ownerFirestore, COLLECTION);
      const docRef = doc(expenseCollectionRef);
      const data = {id: docRef.id, ...DEFAULT_DATA};
      delete data.headers;

      // then
      await assertFails(setDoc(docRef, data));
    });
  });

  describe('Data Restrictions', () => {
    test('A user should be able to update the data of a document', async () => {
      // given
      const id = await createDoc({ headers: [{ key: 'dueDate', type: 'text', display: 'Due Date' }]});

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertSucceeds(setDoc(docRef, {data: [{dueDate: '1st of month', __disabled: false}], modified: new Date()}, {merge: true}));
    });

    test('A user should not be able to remove the data of a document', async () => {
      // given
      const id = await createDoc();

      // when
      const docRef = doc(ownerFirestore, COLLECTION, id);

      // then
      await assertFails(setDoc(docRef, {data: deleteField()}, {merge: true}));
    });

    test('A document should not be created if request.resource.data.data == null', async () => {
      // when
      const expenseCollectionRef = collection(ownerFirestore, COLLECTION);
      const docRef = doc(expenseCollectionRef);
      const data = {id: docRef.id, ...DEFAULT_DATA};
      delete data.data;

      // then
      await assertFails(setDoc(docRef, data));
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
      const docRef = doc(expenseCollectionRef);
      const data = {id: docRef, ...DEFAULT_DATA};
      delete data.acl;

      // then
      await assertFails(setDoc(docRef, data));
    });

    test('A document should not be created if request.resource.acl.editors == null', async () => {
      // when
      const expenseCollectionRef = collection(ownerFirestore, COLLECTION);
      const docRef = doc(expenseCollectionRef);
      const data = {id: docRef, ...DEFAULT_DATA, acl: {viewers: []}};

      // then
      await assertFails(setDoc(docRef, data));
    });

    test('A document should not be created if request.resource.acl.viewers == null', async () => {
      // when
      const expenseCollectionRef = collection(ownerFirestore, COLLECTION);
      const docRef = doc(expenseCollectionRef);
      const data = {id: docRef, ...DEFAULT_DATA, acl: {editors: []}};

      // then
      await assertFails(setDoc(docRef, data));
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
