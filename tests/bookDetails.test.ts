import { Response } from 'express'; 
import Book from '../models/book'; // Adjust the import to your Book model path
import BookInstance from '../models/bookinstance'; // Adjust the import to your BookInstance model path
import { showBookDtls } from '../pages/book_details'; // Adjust the import to where showBookDtls is defined

describe('showBookDtls', () => {
    let res: Partial<Response>;
    const mockBook = {
        title: 'Mock Book Title',
        author: { name: 'Mock Author' }
    };
    const mockCopies = [
        { imprint: 'First Edition', status: 'Available' },
        { imprint: 'Second Edition', status: 'Checked Out' }
    ];

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(), // Chaining for status
            send: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks(); // Clear mocks after each test
    });

    it('should return book details when the book and copies exist', async () => {
        // Mocking the Book model's findOne and populate methods
        const mockFindOne = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(), // Allows method chaining
            exec: jest.fn().mockResolvedValue(mockBook) // Resolves to your mock book
        });
        Book.findOne = mockFindOne;

        // Mocking the BookInstance model's find and select methods
        const mockFind = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(), // Select is called here
            exec: jest.fn().mockResolvedValue(mockCopies)
        });
        BookInstance.find = mockFind;

        // Act
        await showBookDtls(res as Response, '12345');

        // Assert
        expect(mockFindOne).toHaveBeenCalledWith({ _id: '12345' });
        expect(mockFindOne().populate).toHaveBeenCalledWith('author');
        expect(mockFind).toHaveBeenCalledWith({ book: '12345' });
        expect(mockFind().select).toHaveBeenCalledWith('imprint status');

        expect(res.send).toHaveBeenCalledWith({
            title: mockBook.title,
            author: mockBook.author.name,
            copies: mockCopies
        });
    });

    it('should return 404 if the book is not found', async () => {
        const id = '12345';

        // Mocking the Book model's findOne to return null
        Book.findOne = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(null)
        });

        // Mocking the BookInstance model's find and select methods
        const mockFind = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(mockCopies)
        });
        BookInstance.find = mockFind;

        // Act
        await showBookDtls(res as Response, id);

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(`Book ${id} not found`);
    });

    it('should return 404 if book details (copies) are null', async () => {
        const id = '12345';

        // Mocking the Book model's findOne and populate methods
        const mockFindOne = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(mockBook)
        });
        Book.findOne = mockFindOne;

        // Mocking the BookInstance model's find to return null
        BookInstance.find = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(null)
        });

        // Act
        await showBookDtls(res as Response, id);

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(`Book details not found for book ${id}`);
    });

    it('should return book details even if copies array is empty', async () => {
        // Arrange
        const id = '12345';

        // Mocking the Book model's findOne
        Book.findOne = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(mockBook)
        });

        // Mocking the BookInstance model's find to return empty array
        BookInstance.find = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([])
        });

        // Act
        await showBookDtls(res as Response, id);

        // Assert
        expect(res.send).toHaveBeenCalledWith({
            title: mockBook.title,
            author: mockBook.author.name,
            copies: []
        });
    });

    it('should return 500 error if author is missing in book details', async () => {
        // Arrange
        const id = '12345';
        const bookWithoutAuthor = {
            title: 'Mock Book Title',
            author: null
        };

        // Mocking the Book model's findOne
        Book.findOne = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(bookWithoutAuthor)
        });

        // Mocking the BookInstance model's find
        BookInstance.find = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(mockCopies)
        });

        // Act
        await showBookDtls(res as Response, id);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(`Error fetching book ${id}`);
    });

    it('should handle missing author name in book details', async () => {
        // Arrange
        const id = '12345';
        const bookWithAuthorWithoutName = {
            title: 'Mock Book Title',
            author: {}
        };

        // Mocking the Book model's findOne
        Book.findOne = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(bookWithAuthorWithoutName)
        });

        // Mocking the BookInstance model's find
        BookInstance.find = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(mockCopies)
        });

        // Act
        await showBookDtls(res as Response, id);

        // Assert
        expect(res.send).toHaveBeenCalledWith({
            title: bookWithAuthorWithoutName.title,
            author: undefined,
            copies: mockCopies
        });
    });

    it('should return 500 if there is an error fetching the book', async () => {
        // Mocking the Book model's findOne method to throw an error
        Book.findOne = jest.fn().mockImplementation(() => {
            throw new Error('Database error');
        });

        // Act
        await showBookDtls(res as Response, '12345');

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith('Error fetching book 12345');
    });

    it('should return 500 if there is an error fetching book instance', async () => {
        // Mocking the BookInstance model's find method to throw an error
        BookInstance.find = jest.fn().mockImplementation(() => {
            throw new Error('Database error');
        });

        // Mocking the Book model's findOne
        const mockFindOne = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(mockBook)
        });
        Book.findOne = mockFindOne;

        // Act
        await showBookDtls(res as Response, '12345');

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith('Error fetching book 12345');
    });

    // New tests to cover non-string id cases
    it('should return 404 if id is not a string (null)', async () => {
        // Arrange
        const id: any = null;

        // Act
        await showBookDtls(res as Response, id);

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(`Book ${id} not found`);
    });

    it('should return 404 if id is not a string (number)', async () => {
        // Arrange
        const id: any = 12345;

        // Act
        await showBookDtls(res as Response, id);

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(`Book ${id} not found`);
    });

    it('should return 404 if id is undefined', async () => {
        // Arrange
        const id: any = undefined;

        // Act
        await showBookDtls(res as Response, id);

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(`Book ${id} not found`);
    });
});


